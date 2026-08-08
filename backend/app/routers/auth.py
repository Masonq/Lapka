from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import (
    create_access_token, hash_password, verify_password, verify_telegram_auth
)
from app.models.models import AuthProvider, User
from app.schemas.schemas import LoginEmail, RegisterEmail, TelegramAuth, Token, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: RegisterEmail, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Такой email уже зарегистрирован")

    user = User(
        display_name=data.display_name,
        email=data.email,
        password_hash=hash_password(data.password),
        auth_provider=AuthProvider.EMAIL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(data: LoginEmail, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    return Token(access_token=create_access_token(user.id))


@router.post("/telegram", response_model=Token)
def telegram_auth(data: TelegramAuth, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not verify_telegram_auth(dict(payload)):
        raise HTTPException(status_code=401, detail="Подпись Telegram не подтверждена")

    telegram_id = str(data.id)
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        name = data.first_name + (f" {data.last_name}" if data.last_name else "")
        name = name[:80]  # предел колонки User.display_name
        user = User(
            display_name=name,
            telegram_id=telegram_id,
            avatar_url=data.photo_url,
            auth_provider=AuthProvider.TELEGRAM,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return Token(access_token=create_access_token(user.id))
