from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.models import Notification, User
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _to_out(n: Notification) -> NotificationOut:
    out = NotificationOut.model_validate(n)
    out.post_title = n.post.title if n.post else None
    return out


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(Notification)
        .options(joinedload(Notification.actor), joinedload(Notification.post))
        .filter(Notification.user_id == user.id)
        .order_by(desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_to_out(n) for n in rows]


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .count()
    )
    return {"count": count}


@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    if n.user_id != user.id:
        raise HTTPException(status_code=403, detail="Это не твоё уведомление")
    n.is_read = True
    db.commit()
    return {"ok": True}
