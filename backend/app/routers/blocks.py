from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.core.security import get_current_user
from app.models.models import Block, Follow, User
from app.schemas.schemas import BlockedUserOut

router = APIRouter(prefix="/api/blocks", tags=["blocks"])


@router.get("", response_model=list[BlockedUserOut])
def list_blocked(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Block)
        .options(joinedload(Block.blocked))
        .filter(Block.blocker_id == user.id)
        .order_by(Block.created_at.desc())
        .all()
    )
    return [BlockedUserOut(user=row.blocked, created_at=row.created_at) for row in rows]


@router.post("/{user_id}")
def block_user(
    user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail=t("cannot_block_self", lang))

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))

    exists = db.query(Block).filter(Block.blocker_id == user.id, Block.blocked_id == user_id).first()
    if not exists:
        db.add(Block(blocker_id=user.id, blocked_id=user_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # параллельный запрос успел заблокировать — не ошибка

    # блокировка рвёт подписки в обе стороны — не должно оставаться так, будто
    # ничего не произошло, если до этого кто-то из них был подписан на другого
    db.query(Follow).filter(
        ((Follow.follower_id == user.id) & (Follow.following_id == user_id))
        | ((Follow.follower_id == user_id) & (Follow.following_id == user.id))
    ).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def unblock_user(user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Block).filter(Block.blocker_id == user.id, Block.blocked_id == user_id).delete()
    db.commit()
    return {"ok": True}
