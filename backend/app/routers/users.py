from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.models.models import User
from app.routers.auth import SYSTEM_ACCOUNT_EMAIL
from app.schemas.schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def search_users(
    q: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Поиск людей по имени — раньше можно было получить пользователя только зная его id,
    найти человека по имени было вообще нельзя."""
    query = db.query(User).filter(User.email != SYSTEM_ACCOUNT_EMAIL)
    if q:
        query = query.filter(User.display_name.ilike(f"%{q.strip()}%"))
    return query.order_by(User.display_name).offset(offset).limit(limit).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))
    return user
