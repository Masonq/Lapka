from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import RateLimiter
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import Community, CommunityMember, User
from app.schemas.schemas import CommunityCreate, CommunityMemberOut, CommunityOut

router = APIRouter(prefix="/api/communities", tags=["communities"])

community_limiter = RateLimiter(max_actions=3, window_seconds=3600)  # 3 сообщества в час на пользователя


def _to_out(community: Community, member_ids: set[str]) -> CommunityOut:
    out = CommunityOut.model_validate(community)
    out.members_count = len(community.members)
    out.is_member = community.id in member_ids
    return out


@router.get("", response_model=list[CommunityOut])
def list_communities(
    q: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Community)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Community.name.ilike(pattern), Community.description.ilike(pattern)))
    if city:
        query = query.filter(Community.city == city)
    communities = query.order_by(desc(Community.created_at)).all()

    member_ids = set()
    if user:
        member_ids = {
            row.community_id
            for row in db.query(CommunityMember.community_id).filter(CommunityMember.user_id == user.id).all()
        }
    return [_to_out(c, member_ids) for c in communities]


@router.post("", response_model=CommunityOut)
def create_community(
    data: CommunityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    community_limiter.check(user.id)

    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Название не может быть пустым")

    community = Community(
        name=data.name,
        description=data.description,
        avatar_url=data.avatar_url,
        city=data.city,
        created_by=user.id,
    )
    db.add(community)
    db.flush()  # получить community.id до коммита

    # создатель сразу становится участником и админом своего сообщества
    db.add(CommunityMember(community_id=community.id, user_id=user.id, role="admin"))
    db.commit()
    db.refresh(community)
    return _to_out(community, {community.id})


@router.get("/{community_id}", response_model=CommunityOut)
def get_community(
    community_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Сообщество не найдено")

    member_ids = set()
    if user:
        exists = db.query(CommunityMember).filter(
            CommunityMember.community_id == community_id, CommunityMember.user_id == user.id
        ).first()
        if exists:
            member_ids = {community_id}
    return _to_out(community, member_ids)


@router.post("/{community_id}/join")
def join_community(community_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail="Сообщество не найдено")

    exists = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id, CommunityMember.user_id == user.id
    ).first()
    if exists:
        return {"ok": True}

    db.add(CommunityMember(community_id=community_id, user_id=user.id, role="member"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # параллельный запрос успел вступить — не ошибка
    return {"ok": True}


@router.delete("/{community_id}/leave")
def leave_community(community_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id, CommunityMember.user_id == user.id
    ).first()
    if member and member.role == "admin":
        other_admins = db.query(CommunityMember).filter(
            CommunityMember.community_id == community_id,
            CommunityMember.role == "admin",
            CommunityMember.user_id != user.id,
        ).count()
        if other_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="Ты последний админ сообщества — сначала назначь другого или удали сообщество",
            )

    db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id, CommunityMember.user_id == user.id
    ).delete()
    db.commit()
    return {"ok": True}


@router.get("/{community_id}/members", response_model=list[CommunityMemberOut])
def list_members(community_id: str, db: Session = Depends(get_db)):
    return (
        db.query(CommunityMember)
        .filter(CommunityMember.community_id == community_id)
        .order_by(CommunityMember.joined_at)
        .all()
    )
