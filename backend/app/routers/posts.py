from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import post_limiter, comment_limiter
from app.core.security import get_current_user
from app.models.models import Comment, Post, PostType, User
from app.schemas.schemas import CommentCreate, CommentOut, PostCreate, PostOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _to_out(post: Post) -> PostOut:
    out = PostOut.model_validate(post)
    out.comments_count = len(post.comments)
    return out


@router.get("", response_model=list[PostOut])
def list_posts(
    type: Optional[str] = None,
    q: Optional[str] = None,
    author_id: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Post)
    if type:
        try:
            query = query.filter(Post.type == PostType(type))
        except ValueError:
            raise HTTPException(status_code=400, detail="Неизвестный тип поста")
    if author_id:
        query = query.filter(Post.author_id == author_id)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Post.title.ilike(pattern), Post.body.ilike(pattern)))
    posts = query.order_by(desc(Post.created_at)).offset(offset).limit(limit).all()
    return [_to_out(p) for p in posts]


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


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    return _to_out(post)


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
    db.commit()
    db.refresh(comment)
    return comment
