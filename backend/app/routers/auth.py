import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.email import generate_code, send_verification_code
from app.core.i18n import get_lang, t
from app.core.rate_limit import RateLimiter, client_ip, login_limiter, register_limiter
from app.core.security import (
    create_access_token, get_current_user, hash_password, verify_password, verify_telegram_auth
)
from app.core.ws_manager import manager
from app.models.models import AuthProvider, EmailVerificationCode, Notification, User
from app.schemas.schemas import (
    ChangePassword, DeleteAccount, ForgotPassword, LoginEmail, MeOut, RegisterEmail, RequestPasswordChangeCode,
    ResetPassword, TelegramAuth, Token, VerifyRegisterCode
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Смена пароля/удаление аккаунта требуют текущий пароль — лимитируем по пользователю,
# чтобы нельзя было перебирать пароль от чужого угнанного токена
account_action_limiter = RateLimiter(max_actions=5, window_seconds=600)

# Запрос кода — отдельный, более щадящий лимит: пользователь мог не заметить письмо
# и запросить код повторно, это не то же самое, что попытки входа/смены пароля
code_request_limiter = RateLimiter(max_actions=5, window_seconds=600)

# forgot_password не требует авторизации (в отличие от password/request-code) —
# защита нужна по IP, как у самой регистрации, не по user_id
forgot_password_limiter = RateLimiter(max_actions=5, window_seconds=600)

CODE_TTL_MINUTES = 10
MAX_CODE_ATTEMPTS = 5

SYSTEM_ACCOUNT_EMAIL = "team@lapki.info"


def _issue_code(db: Session, email: str, purpose: str, payload: dict | None = None, user_id: str | None = None) -> str:
    """Инвалидирует старые неиспользованные коды той же цели для email
    (иначе при повторном запросе оставался бы валиден и старый код тоже),
    создаёт новый и возвращает его — вызывающая сторона сама решает, что
    с ним делать (в проде — отправить письмом, тесты читают из БД напрямую)."""
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == email,
        EmailVerificationCode.purpose == purpose,
        EmailVerificationCode.used.is_(False),
    ).update({"used": True})

    code = generate_code()
    db.add(EmailVerificationCode(
        email=email,
        code=code,
        purpose=purpose,
        payload=json.dumps(payload) if payload else None,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
    ))
    db.commit()
    return code


def _verify_code(db: Session, email: str, purpose: str, submitted_code: str, lang: str) -> EmailVerificationCode:
    """Общая проверка кода для регистрации и смены пароля — не даёт
    перебирать код бесконечно (MAX_CODE_ATTEMPTS) и не пропускает
    просроченные/уже использованные коды."""
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.used.is_(False),
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail=t("code_not_requested", lang))

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        # SQLite (тесты) не сохраняет timezone-инфо надёжно даже для
        # DateTime(timezone=True) — возвращает naive datetime. PostgreSQL
        # (прод) так не делает, но сравнение должно быть безопасным в обоих случаях
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail=t("code_expired", lang))

    if record.attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(status_code=429, detail=t("too_many_code_attempts", lang))

    if record.code != submitted_code:
        record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail=t("wrong_code", lang))

    record.used = True
    db.commit()
    return record


def _get_or_create_system_user(db: Session) -> User:
    """Аккаунт 'Команда Lapki' — от его имени идут системные уведомления
    (например, приветствие при регистрации). is_admin=True — чтобы бейдж
    'Администрация' показывался автоматически, той же логикой, что и везде."""
    system_user = db.query(User).filter(User.email == SYSTEM_ACCOUNT_EMAIL).first()
    if system_user:
        return system_user

    system_user = User(
        display_name="Команда Lapki",
        email=SYSTEM_ACCOUNT_EMAIL,
        auth_provider=AuthProvider.EMAIL,
        is_admin=True,
        city="Beograd",
    )
    db.add(system_user)
    db.commit()
    db.refresh(system_user)
    return system_user


def _send_welcome_notification(db: Session, new_user: User):
    system_user = _get_or_create_system_user(db)
    db.add(Notification(user_id=new_user.id, actor_id=system_user.id, type="welcome"))
    db.commit()
    manager.notify_user_sync(new_user.id, {"type": "new_notification", "notification_type": "welcome"})


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/onboarding-complete", response_model=MeOut)
def complete_onboarding(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Отмечает онбординг пройденным — идемпотентно, повторный вызов ничего не ломает."""
    user.has_completed_onboarding = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/request-code")
def request_register_code(
    data: RegisterEmail, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db),
    lang: str = Depends(get_lang),
):
    """Первый шаг регистрации — код на почту. Реальный User ещё не создаётся:
    payload хранит display_name+хеш пароля, аккаунт появится только в
    verify-code. Значит незавершённые регистрации не оставляют мусора в базе.

    Письмо отправляется в фоне (background_tasks), а не синхронно внутри
    запроса — реальное SMTP-соединение может быть медленным или зависнуть
    (например, если хостер блокирует исходящий порт 587/465), и раньше это
    вешало весь HTTP-запрос на неопределённое время, хотя код уже успешно
    создавался в базе. Пользователь теперь получает ответ мгновенно."""
    register_limiter.check(client_ip(request))

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail=t("email_already_registered", lang))

    code = _issue_code(
        db, data.email, "register",
        payload={"display_name": data.display_name, "password_hash": hash_password(data.password)},
    )
    background_tasks.add_task(send_verification_code, data.email, code, "register")
    return {"message": "Код отправлен на почту"}


@router.post("/register/verify-code", response_model=Token)
def verify_register_code(data: VerifyRegisterCode, db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    record = _verify_code(db, data.email, "register", data.code, lang)

    if db.query(User).filter(User.email == data.email).first():
        # Гонка — например, две вкладки одновременно подтвердили один и тот же код
        raise HTTPException(status_code=400, detail=t("email_already_registered", lang))

    payload = json.loads(record.payload)
    user = User(
        display_name=payload["display_name"],
        email=data.email,
        password_hash=payload["password_hash"],
        auth_provider=AuthProvider.EMAIL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _send_welcome_notification(db, user)
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(data: LoginEmail, request: Request, db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    login_limiter.check(client_ip(request))

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail=t("wrong_email_or_password", lang))
    if user.is_banned:
        detail = t("account_banned", lang)
        if user.ban_reason:
            detail += f": {user.ban_reason}"
        raise HTTPException(status_code=403, detail=detail)
    return Token(access_token=create_access_token(user.id))


@router.post("/telegram", response_model=Token)
def telegram_auth(data: TelegramAuth, request: Request, db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    login_limiter.check(client_ip(request))

    payload = data.model_dump()
    if not verify_telegram_auth(dict(payload)):
        raise HTTPException(status_code=401, detail=t("telegram_signature_invalid", lang))

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
        _send_welcome_notification(db, user)
    elif user.is_banned:
        detail = t("account_banned", lang)
        if user.ban_reason:
            detail += f": {user.ban_reason}"
        raise HTTPException(status_code=403, detail=detail)

    return Token(access_token=create_access_token(user.id))


@router.post("/password/request-code")
def request_password_change_code(
    data: RequestPasswordChangeCode, background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), user: User = Depends(get_current_user), lang: str = Depends(get_lang),
):
    account_action_limiter.check(user.id)
    code_request_limiter.check(user.id)

    if user.auth_provider != AuthProvider.EMAIL or not user.password_hash:
        raise HTTPException(status_code=400, detail=t("no_password_telegram_account", lang))
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail=t("wrong_current_password", lang))

    code = _issue_code(db, user.email, "change_password", user_id=user.id)
    background_tasks.add_task(send_verification_code, user.email, code, "change_password")
    return {"message": "Код отправлен на почту"}


@router.patch("/password")
def change_password(
    data: ChangePassword, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    account_action_limiter.check(user.id)

    if user.auth_provider != AuthProvider.EMAIL or not user.password_hash:
        raise HTTPException(
            status_code=400, detail=t("no_password_telegram_account", lang)
        )
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail=t("wrong_current_password", lang))

    _verify_code(db, user.email, "change_password", data.code, lang)

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.post("/password/forgot")
def forgot_password(
    data: ForgotPassword, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """Восстановление забытого пароля — в отличие от /password/request-code
    не требует авторизации вообще (пользователь по определению не может
    войти, раз забыл пароль). Ответ ВСЕГДА одинаковый, независимо от того,
    нашёлся ли аккаунт с таким email — иначе по разнице в ответе можно было
    бы перебором узнавать, какие email вообще зарегистрированы на сайте."""
    forgot_password_limiter.check(client_ip(request))

    user = db.query(User).filter(User.email == data.email).first()
    if user and user.auth_provider == AuthProvider.EMAIL and user.password_hash:
        code = _issue_code(db, data.email, "password_reset", user_id=user.id)
        background_tasks.add_task(send_verification_code, data.email, code, "password_reset")

    return {"message": "Если аккаунт с таким email существует, код отправлен на почту"}


@router.post("/password/reset", response_model=Token)
def reset_password(data: ResetPassword, db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    _verify_code(db, data.email, "password_reset", data.code, lang)

    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.auth_provider != AuthProvider.EMAIL:
        # Код мог быть верным (для существующего email), но сам аккаунт с тех
        # пор мог быть удалён — редкий, но реальный edge case
        raise HTTPException(status_code=400, detail=t("password_reset_failed", lang))

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return Token(access_token=create_access_token(user.id))


@router.delete("/me")
def delete_account(
    data: DeleteAccount, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    account_action_limiter.check(user.id)

    if user.auth_provider == AuthProvider.EMAIL and user.password_hash:
        if not data.password or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail=t("wrong_password", lang))

    # Питомцы/посты/анкета исполнителя удалятся каскадом на уровне ORM и БД (ondelete=CASCADE
    # на всех связанных таблицах — комментарии, подписки, сохранённое, жалобы, уведомления)
    db.delete(user)
    db.commit()
    return {"ok": True}
