from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.models import Follow, User
from app.schemas.schemas import UserOut

router = APIRouter(prefix="/api/follows", tags=["follows"])


@router.post("/{user_id}")
def follow_user(user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя подписаться на себя")
    exists = db.query(Follow).filter(
        Follow.follower_id == user.id, Follow.following_id == user_id
    ).first()
    if exists:
        return {"ok": True}
    db.add(Follow(follower_id=user.id, following_id=user_id))
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def unfollow_user(user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Follow).filter(
        Follow.follower_id == user.id, Follow.following_id == user_id
    ).delete()
    db.commit()
    return {"ok": True}


@router.get("/{user_id}/followers", response_model=list[UserOut])
def followers(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(User)
        .join(Follow, Follow.follower_id == User.id)
        .filter(Follow.following_id == user_id)
        .all()
    )
