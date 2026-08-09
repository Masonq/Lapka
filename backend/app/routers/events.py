from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import event_limiter
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import Event, EventParticipant, Pet, User
from app.schemas.schemas import EventCreate, EventOut, EventParticipantOut

router = APIRouter(prefix="/api/events", tags=["events"])


def _to_out(event: Event, going_ids: set[str], counts: dict[str, int] | None = None) -> EventOut:
    out = EventOut.model_validate(event)
    # counts передаётся батчем в list_events — без него (create/get одного события)
    # обход event.participants — единичный лишний запрос, не проблема на одном объекте
    if counts is not None:
        out.participants_count = counts.get(event.id, 0)
    else:
        out.participants_count = sum(1 for p in event.participants if p.status == "going")
    out.is_going = event.id in going_ids
    out.pet_name = event.pet.name if event.pet else None
    return out


@router.get("", response_model=list[EventOut])
def list_events(
    type: Optional[str] = None,
    community_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Event)
    if type:
        query = query.filter(Event.type == type)
    if community_id:
        query = query.filter(Event.community_id == community_id)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Event.title.ilike(pattern), Event.description.ilike(pattern)))
    events = query.order_by(asc(Event.starts_at)).offset(offset).limit(limit).all()

    going_ids = set()
    if user and events:
        event_ids = [e.id for e in events]
        going_ids = {
            row.event_id
            for row in db.query(EventParticipant.event_id)
            .filter(
                EventParticipant.user_id == user.id,
                EventParticipant.event_id.in_(event_ids),
                EventParticipant.status == "going",
            )
            .all()
        }

    # один агрегирующий запрос вместо N+1 (было: отдельный запрос на каждое событие
    # через event.participants внутри цикла — та же проблема, что нашлась и в communities.py)
    counts = {}
    if events:
        rows = (
            db.query(EventParticipant.event_id, func.count(EventParticipant.id))
            .filter(
                EventParticipant.event_id.in_([e.id for e in events]),
                EventParticipant.status == "going",
            )
            .group_by(EventParticipant.event_id)
            .all()
        )
        counts = {eid: 0 for eid in [e.id for e in events]}
        counts.update(dict(rows))

    return [_to_out(e, going_ids, counts) for e in events]


@router.post("", response_model=EventOut)
def create_event(data: EventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event_limiter.check(user.id)

    if data.type not in ("walk", "event"):
        raise HTTPException(status_code=400, detail="Неизвестный тип: должно быть walk или event")

    if data.pet_id:
        pet = db.query(Pet).filter(Pet.id == data.pet_id, Pet.owner_id == user.id).first()
        if not pet:
            raise HTTPException(status_code=403, detail="Можно указать только своего питомца")

    event = Event(
        organizer_id=user.id,
        type=data.type,
        title=data.title,
        description=data.description,
        location=data.location,
        starts_at=data.starts_at,
        capacity=data.capacity,
        pet_id=data.pet_id,
        community_id=data.community_id,
    )
    db.add(event)
    db.flush()

    # организатор сразу в участниках
    db.add(EventParticipant(event_id=event.id, user_id=user.id, status="going"))
    db.commit()
    db.refresh(event)
    return _to_out(event, {event.id})


@router.get("/{event_id}", response_model=EventOut)
def get_event(
    event_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")

    going_ids = set()
    if user:
        exists = db.query(EventParticipant).filter(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user.id,
            EventParticipant.status == "going",
        ).first()
        if exists:
            going_ids = {event_id}
    return _to_out(event, going_ids)


@router.post("/{event_id}/join")
def join_event(event_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")

    existing = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id, EventParticipant.user_id == user.id
    ).first()

    if existing and existing.status == "going":
        return {"ok": True}

    if event.capacity is not None:
        going_count = db.query(EventParticipant).filter(
            EventParticipant.event_id == event_id, EventParticipant.status == "going"
        ).count()
        if going_count >= event.capacity:
            raise HTTPException(status_code=400, detail="Мест больше нет")

    if existing:
        existing.status = "going"
        db.commit()
        return {"ok": True}

    db.add(EventParticipant(event_id=event_id, user_id=user.id, status="going"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # параллельный запрос успел присоединиться — не ошибка
    return {"ok": True}


@router.delete("/{event_id}/leave")
def leave_event(event_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id, EventParticipant.user_id == user.id
    ).delete()
    db.commit()
    return {"ok": True}


@router.get("/{event_id}/participants", response_model=list[EventParticipantOut])
def list_participants(event_id: str, db: Session = Depends(get_db)):
    return (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event_id, EventParticipant.status == "going")
        .order_by(EventParticipant.joined_at)
        .all()
    )
