from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.core.rate_limit import RateLimiter
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import Community, CommunityMember, User
from app.schemas.schemas import CommunityCreate, CommunityMemberOut, CommunityOut, CommunityUpdate

router = APIRouter(prefix="/api/communities", tags=["communities"])

community_limiter = RateLimiter(max_actions=3, window_seconds=3600)  # 3 сообщества в час на пользователя


def _to_out(
    community: Community, member_ids: set[str], counts: dict[str, int] | None = None,
    admin_ids: set[str] | None = None,
) -> CommunityOut:
    out = CommunityOut.model_validate(community)
    # counts передаётся батчем в list_communities (см. ниже) — без него (создание/detail
    # одного сообщества) len(community.members) — один лишний запрос, не проблема на единичном объекте
    out.members_count = counts[community.id] if counts is not None else len(community.members)
    out.is_member = community.id in member_ids
    out.is_admin = community.id in admin_ids if admin_ids is not None else False
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

    # один агрегирующий запрос на все сообщества разом — раньше len(community.members)
    # внутри цикла давал отдельный SQL-запрос на каждое сообщество (N+1, проверено:
    # 3 сообщества давали 5 запросов вместо 2)
    counts = dict(
        db.query(CommunityMember.community_id, func.count(CommunityMember.id))
        .filter(CommunityMember.community_id.in_([c.id for c in communities]))
        .group_by(CommunityMember.community_id)
        .all()
    ) if communities else {}
    counts = {cid: counts.get(cid, 0) for cid in [c.id for c in communities]}

    return [_to_out(c, member_ids, counts) for c in communities]


@router.post("", response_model=CommunityOut)
def create_community(
    data: CommunityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    community_limiter.check(user.id)

    if not data.name.strip():
        raise HTTPException(status_code=400, detail=t("community_name_required", lang))

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
    return _to_out(community, {community.id}, admin_ids={community.id})


@router.get("/{community_id}", response_model=CommunityOut)
def get_community(
    community_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional),
    lang: str = Depends(get_lang),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail=t("community_not_found", lang))

    member_ids = set()
    admin_ids = set()
    if user:
        membership = db.query(CommunityMember).filter(
            CommunityMember.community_id == community_id, CommunityMember.user_id == user.id
        ).first()
        if membership:
            member_ids = {community_id}
            if membership.role == "admin":
                admin_ids = {community_id}
    return _to_out(community, member_ids, admin_ids=admin_ids)


@router.patch("/{community_id}", response_model=CommunityOut)
def update_community(
    community_id: str, data: CommunityUpdate, db: Session = Depends(get_db),
    user: User = Depends(get_current_user), lang: str = Depends(get_lang),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail=t("community_not_found", lang))

    is_admin = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user.id,
        CommunityMember.role == "admin",
    ).first()
    if not is_admin:
        raise HTTPException(status_code=403, detail=t("only_community_admin_can_edit", lang))

    if data.name is not None:
        community.name = data.name
    if data.description is not None:
        community.description = data.description
    if data.avatar_url is not None:
        community.avatar_url = data.avatar_url
    if data.city is not None:
        community.city = data.city
    db.commit()
    db.refresh(community)

    member_ids = {community_id}  # раз пользователь admin — он точно участник
    return _to_out(community, member_ids, admin_ids={community_id})


@router.post("/{community_id}/join")
def join_community(
    community_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail=t("community_not_found", lang))

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
def leave_community(
    community_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
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
                detail=t("last_admin_cannot_leave", lang),
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
        .options(joinedload(CommunityMember.user))
        .filter(CommunityMember.community_id == community_id)
        .order_by(CommunityMember.joined_at)
        .all()
    )
