from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.core.rate_limit import post_limiter, comment_limiter, report_limiter, sighting_limiter
from app.core.security import get_current_user, get_current_user_optional
from app.core.ws_manager import manager
from app.models.models import Comment, CommunityMember, Event, Follow, Notification, Post, PostReaction, Report, SavedPost, Sighting, PostType, User
from app.schemas.schemas import CommentCreate, CommentOut, PostCreate, PostOut, PostUpdate, ReactionCreate, ReportCreate, SightingCreate, SightingOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _to_out(
    post: Post, saved_ids: set[str] | None = None, comments_count: int | None = None,
    reactions: dict[str, int] | None = None, my_reaction: str | None = None,
) -> PostOut:
    out = PostOut.model_validate(post)
    # comments_count передаётся батчем в list_posts (см. ниже) — без него (создание/
    # get одного поста) len(post.comments) — единичный лишний запрос, не проблема
    out.comments_count = comments_count if comments_count is not None else len(post.comments)
    out.is_saved = post.id in saved_ids if saved_ids is not None else False
    out.reactions = reactions or {}
    out.my_reaction = my_reaction
    return out


@router.get("", response_model=list[PostOut])
def list_posts(
    type: Optional[str] = None,
    q: Optional[str] = None,
    author_id: Optional[str] = None,
    community_id: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    following: bool = False,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
    lang: str = Depends(get_lang),
):
    query = db.query(Post).options(joinedload(Post.author))
    if type:
        try:
            query = query.filter(Post.type == PostType(type))
        except ValueError:
            raise HTTPException(status_code=400, detail=t("unknown_post_type", lang))
    if author_id:
        query = query.filter(Post.author_id == author_id)
    if community_id:
        query = query.filter(Post.community_id == community_id)
    if is_resolved is not None:
        query = query.filter(Post.is_resolved == is_resolved)
    if following:
        if not user:
            raise HTTPException(status_code=401, detail=t("login_required_for_following_feed", lang))
        followed_ids = [
            row.following_id
            for row in db.query(Follow.following_id).filter(Follow.follower_id == user.id).all()
        ]
        if not followed_ids:
            return []
        query = query.filter(Post.author_id.in_(followed_ids))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Post.title.ilike(pattern), Post.body.ilike(pattern)))
    posts = query.order_by(desc(Post.created_at)).offset(offset).limit(limit).all()

    saved_ids = set()
    comment_counts: dict[str, int] = {}
    if posts:
        post_ids = [p.id for p in posts]
        if user:
            saved_ids = {
                row.post_id
                for row in db.query(SavedPost.post_id)
                .filter(SavedPost.user_id == user.id, SavedPost.post_id.in_(post_ids))
                .all()
            }
        # один агрегирующий запрос вместо len(post.comments) внутри цикла (было: отдельный
        # запрос на каждый пост — тот же класс N+1, что уже находили и чинили в
        # communities.py, events.py, messages.py — здесь, в ленте, самом нагруженном
        # эндпоинте всего приложения, было 11 запросов на 5 постов вместо 3)
        rows = (
            db.query(Comment.post_id, func.count(Comment.id))
            .filter(Comment.post_id.in_(post_ids))
            .group_by(Comment.post_id)
            .all()
        )
        comment_counts = dict(rows)

    reactions_by_post, my_reaction_by_post = _load_reactions(db, [p.id for p in posts] if posts else [], user)

    return [
        _to_out(p, saved_ids, comment_counts.get(p.id, 0), reactions_by_post.get(p.id), my_reaction_by_post.get(p.id))
        for p in posts
    ]


def _load_reactions(
    db: Session, post_ids: list[str], user: Optional[User]
) -> tuple[dict[str, dict[str, int]], dict[str, str]]:
    """Батч-загрузка реакций на несколько постов разом — тот же принцип, что
    и comment_counts выше, не N+1 запросов по одному на пост."""
    if not post_ids:
        return {}, {}
    rows = (
        db.query(PostReaction.post_id, PostReaction.emoji, func.count(PostReaction.id))
        .filter(PostReaction.post_id.in_(post_ids))
        .group_by(PostReaction.post_id, PostReaction.emoji)
        .all()
    )
    reactions_by_post: dict[str, dict[str, int]] = {}
    for post_id, emoji, count in rows:
        reactions_by_post.setdefault(post_id, {})[emoji] = count

    my_reaction_by_post: dict[str, str] = {}
    if user:
        my_rows = (
            db.query(PostReaction.post_id, PostReaction.emoji)
            .filter(PostReaction.post_id.in_(post_ids), PostReaction.user_id == user.id)
            .all()
        )
        my_reaction_by_post = dict(my_rows)

    return reactions_by_post, my_reaction_by_post


@router.post("", response_model=PostOut)
def create_post(
    data: PostCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post_limiter.check(user.id)

    if not data.title.strip() or not data.body.strip():
        raise HTTPException(status_code=400, detail=t("title_and_body_required", lang))

    try:
        post_type = PostType(data.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=t("unknown_post_type", lang))

    if data.community_id:
        is_member = db.query(CommunityMember).filter(
            CommunityMember.community_id == data.community_id, CommunityMember.user_id == user.id
        ).first()
        if not is_member:
            raise HTTPException(status_code=403, detail=t("must_join_community_to_post", lang))

    post = Post(
        author_id=user.id,
        type=post_type,
        title=data.title,
        body=data.body,
        photo_url=data.photo_url,
        last_seen_location=data.last_seen_location,
        last_seen_lat=data.last_seen_lat,
        last_seen_lng=data.last_seen_lng,
        community_id=data.community_id,
        show_staff_badge=data.show_staff_badge,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.get("/saved", response_model=list[PostOut])
def list_saved_posts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    saved_post_ids = [
        row.post_id
        for row in db.query(SavedPost.post_id)
        .filter(SavedPost.user_id == user.id)
        .order_by(desc(SavedPost.created_at))
        .all()
    ]
    if not saved_post_ids:
        return []
    posts_by_id = {
        p.id: p
        for p in db.query(Post).options(joinedload(Post.author)).filter(Post.id.in_(saved_post_ids)).all()
    }
    saved_set = set(saved_post_ids)
    comment_counts = dict(
        db.query(Comment.post_id, func.count(Comment.id))
        .filter(Comment.post_id.in_(saved_post_ids))
        .group_by(Comment.post_id)
        .all()
    )
    # сохраняем порядок "сохранено недавно — выше", а не порядок публикации
    ordered = [posts_by_id[pid] for pid in saved_post_ids if pid in posts_by_id]
    reactions_by_post, my_reaction_by_post = _load_reactions(db, saved_post_ids, user)
    return [
        _to_out(p, saved_set, comment_counts.get(p.id, 0), reactions_by_post.get(p.id), my_reaction_by_post.get(p.id))
        for p in ordered
    ]


@router.get("/local-pulse")
def local_pulse(db: Session = Depends(get_db)):
    """Раздел 3 блюпринта — 'Local Pulse: события и потеряшки рядом'. Гео у нас нет
    (город-scoped приложение, см. раздел 11), поэтому 'рядом' = по всему городу —
    честно, без имитации точной геолокации."""
    active_lost = db.query(Post).filter(Post.type == PostType.LOST, Post.is_resolved.is_(False)).count()
    active_found = db.query(Post).filter(Post.type == PostType.FOUND, Post.is_resolved.is_(False)).count()
    upcoming_events = db.query(Event).filter(Event.starts_at >= datetime.now(timezone.utc)).count()
    return {
        "active_lost_count": active_lost,
        "active_found_count": active_found,
        "upcoming_events_count": upcoming_events,
    }


@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    saved_ids = set()
    if user:
        exists = db.query(SavedPost).filter(SavedPost.user_id == user.id, SavedPost.post_id == post_id).first()
        if exists:
            saved_ids.add(post_id)
    reactions_by_post, my_reaction_by_post = _load_reactions(db, [post_id], user)
    return _to_out(post, saved_ids, None, reactions_by_post.get(post_id), my_reaction_by_post.get(post_id))


@router.patch("/{post_id}/resolve", response_model=PostOut)
def resolve_post(
    post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail=t("can_only_resolve_own_post", lang))
    post.is_resolved = True
    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.patch("/{post_id}", response_model=PostOut)
def update_post(
    post_id: str, data: PostUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).options(joinedload(Post.author)).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail=t("can_only_edit_own_post", lang))

    if data.title is not None:
        if not data.title.strip():
            raise HTTPException(status_code=400, detail=t("title_required", lang))
        post.title = data.title
    if data.body is not None:
        if not data.body.strip():
            raise HTTPException(status_code=400, detail=t("body_required", lang))
        post.body = data.body
    if data.photo_url is not None:
        post.photo_url = data.photo_url
    if data.last_seen_location is not None:
        post.last_seen_location = data.last_seen_location

    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.delete("/{post_id}")
def delete_post(
    post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail=t("can_only_delete_own_post", lang))
    db.delete(post)
    db.commit()
    return {"ok": True}


@router.get("/{post_id}/comments", response_model=list[CommentOut])
def list_comments(post_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at)
        .all()
    )


@router.post("/{post_id}/comments", response_model=CommentOut)
def add_comment(
    post_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    comment_limiter.check(user.id)

    if not data.body.strip():
        raise HTTPException(status_code=400, detail=t("comment_required", lang))

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    comment = Comment(post_id=post_id, author_id=user.id, body=data.body)
    db.add(comment)
    notify_author = post.author_id != user.id
    if notify_author:
        db.add(Notification(user_id=post.author_id, actor_id=user.id, type="comment", post_id=post_id))
    db.commit()
    db.refresh(comment)
    if notify_author:
        manager.notify_user_sync(post.author_id, {"type": "new_notification", "notification_type": "comment"})
    return comment


@router.post("/{post_id}/save")
def save_post(
    post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))

    exists = db.query(SavedPost).filter(SavedPost.user_id == user.id, SavedPost.post_id == post_id).first()
    if exists:
        return {"ok": True}

    db.add(SavedPost(user_id=user.id, post_id=post_id))
    try:
        db.commit()
    except IntegrityError:
        # параллельный запрос успел сохранить между проверкой и коммитом — не ошибка
        db.rollback()
    return {"ok": True}


@router.delete("/{post_id}/save")
def unsave_post(post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(SavedPost).filter(SavedPost.user_id == user.id, SavedPost.post_id == post_id).delete()
    db.commit()
    return {"ok": True}


ALLOWED_REACTION_EMOJIS = {"👍", "❤️", "😂", "😮", "😢", "🐾"}


@router.put("/{post_id}/reaction", response_model=PostOut)
def react_to_post(
    post_id: str, data: ReactionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    if data.emoji not in ALLOWED_REACTION_EMOJIS:
        raise HTTPException(status_code=400, detail=t("invalid_emoji", lang))

    existing = db.query(PostReaction).filter(
        PostReaction.post_id == post_id, PostReaction.user_id == user.id
    ).first()
    if existing:
        existing.emoji = data.emoji
    else:
        db.add(PostReaction(post_id=post_id, user_id=user.id, emoji=data.emoji))
    try:
        db.commit()
    except IntegrityError:
        # параллельный тап успел вставить между проверкой и коммитом — тот же
        # паттерн гонки, что уже обрабатывается в save_post выше
        db.rollback()
        existing = db.query(PostReaction).filter(
            PostReaction.post_id == post_id, PostReaction.user_id == user.id
        ).first()
        if existing:
            existing.emoji = data.emoji
            db.commit()

    reactions_by_post, my_reaction_by_post = _load_reactions(db, [post_id], user)
    return _to_out(post, None, None, reactions_by_post.get(post_id), my_reaction_by_post.get(post_id))


@router.delete("/{post_id}/reaction", response_model=PostOut)
def remove_reaction(
    post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    db.query(PostReaction).filter(PostReaction.post_id == post_id, PostReaction.user_id == user.id).delete()
    db.commit()
    reactions_by_post, my_reaction_by_post = _load_reactions(db, [post_id], user)
    return _to_out(post, None, None, reactions_by_post.get(post_id), my_reaction_by_post.get(post_id))


@router.post("/{post_id}/report")
def report_post(
    post_id: str,
    data: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    report_limiter.check(user.id)

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))

    db.add(Report(reporter_id=user.id, post_id=post_id, reason=data.reason))
    db.commit()
    return {"ok": True}


@router.get("/{post_id}/sightings", response_model=list[SightingOut])
def list_sightings(post_id: str, db: Session = Depends(get_db)):
    return (
        db.query(Sighting)
        .options(joinedload(Sighting.reporter))
        .filter(Sighting.post_id == post_id)
        .order_by(desc(Sighting.created_at))
        .all()
    )


@router.post("/{post_id}/sightings", response_model=SightingOut)
def add_sighting(
    post_id: str,
    data: SightingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    """'Видел питомца тут' — только для потеряшек/находок, не для обычных постов:
    у вопроса или пристройства нет смысла отмечать место наблюдения."""
    sighting_limiter.check(user.id)

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=t("post_not_found", lang))
    if post.type not in (PostType.LOST, PostType.FOUND):
        raise HTTPException(status_code=400, detail=t("sighting_only_for_lost_found", lang))

    sighting = Sighting(
        post_id=post_id,
        reporter_id=user.id,
        location=data.location,
        note=data.note,
        seen_at=data.seen_at,
    )
    db.add(sighting)

    notify_author = post.author_id != user.id
    if notify_author:
        db.add(Notification(user_id=post.author_id, actor_id=user.id, type="sighting", post_id=post_id))

    db.commit()
    db.refresh(sighting)
    if notify_author:
        manager.notify_user_sync(post.author_id, {"type": "new_notification", "notification_type": "sighting"})
    return sighting
