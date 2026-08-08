from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import post_limiter, comment_limiter, report_limiter
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import Comment, Follow, Notification, Post, Report, SavedPost, PostType, User
from app.schemas.schemas import CommentCreate, CommentOut, PostCreate, PostOut, ReportCreate

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _to_out(post: Post, saved_ids: set[str] | None = None) -> PostOut:
    out = PostOut.model_validate(post)
    out.comments_count = len(post.comments)
    out.is_saved = post.id in saved_ids if saved_ids is not None else False
    return out


@router.get("", response_model=list[PostOut])
def list_posts(
    type: Optional[str] = None,
    q: Optional[str] = None,
    author_id: Optional[str] = None,
    following: bool = False,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Post)
    if type:
        try:
            query = query.filter(Post.type == PostType(type))
        except ValueError:
            raise HTTPException(status_code=400, detail="Неизвестный тип поста")
    if author_id:
        query = query.filter(Post.author_id == author_id)
    if following:
        if not user:
            raise HTTPException(status_code=401, detail="Войди, чтобы смотреть ленту подписок")
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
    if user and posts:
        post_ids = [p.id for p in posts]
        saved_ids = {
            row.post_id
            for row in db.query(SavedPost.post_id)
            .filter(SavedPost.user_id == user.id, SavedPost.post_id.in_(post_ids))
            .all()
        }
    return [_to_out(p, saved_ids) for p in posts]


@router.post("", response_model=PostOut)
def create_post(data: PostCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post_limiter.check(user.id)

    if not data.title.strip() or not data.body.strip():
        raise HTTPException(status_code=400, detail="Заголовок и описание не могут быть пустыми")

    try:
        post_type = PostType(data.type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неизвестный тип поста")

    post = Post(
        author_id=user.id,
        type=post_type,
        title=data.title,
        body=data.body,
        photo_url=data.photo_url,
        last_seen_location=data.last_seen_location,
        last_seen_lat=data.last_seen_lat,
        last_seen_lng=data.last_seen_lng,
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
    posts_by_id = {p.id: p for p in db.query(Post).filter(Post.id.in_(saved_post_ids)).all()}
    saved_set = set(saved_post_ids)
    # сохраняем порядок "сохранено недавно — выше", а не порядок публикации
    ordered = [posts_by_id[pid] for pid in saved_post_ids if pid in posts_by_id]
    return [_to_out(p, saved_set) for p in ordered]


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    saved_ids = set()
    if user:
        exists = db.query(SavedPost).filter(SavedPost.user_id == user.id, SavedPost.post_id == post_id).first()
        if exists:
            saved_ids.add(post_id)
    return _to_out(post, saved_ids)


@router.patch("/{post_id}/resolve", response_model=PostOut)
def resolve_post(post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Можно закрыть только свой пост")
    post.is_resolved = True
    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.delete("/{post_id}")
def delete_post(post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Можно удалить только свой пост")
    db.delete(post)
    db.commit()
    return {"ok": True}


@router.get("/{post_id}/comments", response_model=list[CommentOut])
def list_comments(post_id: str, db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at).all()


@router.post("/{post_id}/comments", response_model=CommentOut)
def add_comment(
    post_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comment_limiter.check(user.id)

    if not data.body.strip():
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым")

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    comment = Comment(post_id=post_id, author_id=user.id, body=data.body)
    db.add(comment)
    if post.author_id != user.id:
        db.add(Notification(user_id=post.author_id, actor_id=user.id, type="comment", post_id=post_id))
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/{post_id}/save")
def save_post(post_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

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


@router.post("/{post_id}/report")
def report_post(
    post_id: str,
    data: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report_limiter.check(user.id)

    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")

    db.add(Report(reporter_id=user.id, post_id=post_id, reason=data.reason))
    db.commit()
    return {"ok": True}
