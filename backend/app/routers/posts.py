from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.models import Comment, Post, PostType, User
from app.schemas.schemas import CommentCreate, CommentOut, PostCreate, PostOut

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _to_out(post: Post) -> PostOut:
    out = PostOut.from_orm(post)
    out.comments_count = len(post.comments)
    return out


@router.get("", response_model=list[PostOut])
def list_posts(
    type: Optional[str] = None,
    limit: int = 30,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Post)
    if type:
        try:
            q = q.filter(Post.type == PostType(type))
        except ValueError:
            raise HTTPException(status_code=400, detail="Неизвестный тип поста")
    posts = q.order_by(desc(Post.created_at)).offset(offset).limit(limit).all()
    return [_to_out(p) for p in posts]


@router.post("", response_model=PostOut)
def create_post(data: PostCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
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
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    comment = Comment(post_id=post_id, author_id=user.id, body=data.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
