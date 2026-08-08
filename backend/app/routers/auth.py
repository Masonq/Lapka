from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import RateLimiter, client_ip, login_limiter, register_limiter
from app.core.security import (
    create_access_token, get_current_user, hash_password, verify_password, verify_telegram_auth
)
from app.models.models import AuthProvider, User
from app.schemas.schemas import (
    ChangePassword, DeleteAccount, LoginEmail, RegisterEmail, TelegramAuth, Token, UserOut
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Смена пароля/удаление аккаунта требуют текущий пароль — лимитируем по пользователю,
# чтобы нельзя было перебирать пароль от чужого угнанного токена
account_action_limiter = RateLimiter(max_actions=5, window_seconds=600)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/register", response_model=Token)
def register(data: RegisterEmail, request: Request, db: Session = Depends(get_db)):
    register_limiter.check(client_ip(request))

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
def login(data: LoginEmail, request: Request, db: Session = Depends(get_db)):
    login_limiter.check(client_ip(request))

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    return Token(access_token=create_access_token(user.id))


@router.post("/telegram", response_model=Token)
def telegram_auth(data: TelegramAuth, request: Request, db: Session = Depends(get_db)):
    login_limiter.check(client_ip(request))

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


@router.patch("/password")
def change_password(
    data: ChangePassword, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    account_action_limiter.check(user.id)

    if user.auth_provider != AuthProvider.EMAIL or not user.password_hash:
        raise HTTPException(
            status_code=400, detail="У аккаунта нет пароля — вход через Telegram, менять нечего"
        )
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Текущий пароль неверен")

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.delete("/me")
def delete_account(
    data: DeleteAccount, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    account_action_limiter.check(user.id)

    if user.auth_provider == AuthProvider.EMAIL and user.password_hash:
        if not data.password or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Неверный пароль")

    # Питомцы/посты/анкета исполнителя удалятся каскадом на уровне ORM и БД (ondelete=CASCADE
    # на всех связанных таблицах — комментарии, подписки, сохранённое, жалобы, уведомления)
    db.delete(user)
    db.commit()
    return {"ok": True}
