from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.core.rate_limit import RateLimiter
from app.core.security import get_current_user
from app.core.ws_manager import manager
from app.models.models import Block, Message, User
from app.schemas.schemas import ConversationOut, MessageCreate, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])

message_limiter = RateLimiter(max_actions=30, window_seconds=600)  # 30 сообщений за 10 минут


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Список бесед — по одной строке на собеседника, с последним сообщением и
    счётчиком непрочитанных. Без отдельной таблицы Conversation: беседа выводится
    из уникальных пар (sender, recipient) в самих сообщениях."""
    rows = (
        db.query(Message.id, Message.sender_id, Message.recipient_id, Message.body, Message.created_at)
        .filter(or_(Message.sender_id == user.id, Message.recipient_id == user.id))
        .order_by(desc(Message.created_at))
        .all()
    )

    # первое (по времени, т.к. rows уже отсортированы desc) сообщение с каждым
    # собеседником — то и есть последнее сообщение беседы
    last_message_by_partner: dict[str, tuple] = {}
    for m in rows:
        partner_id = m.recipient_id if m.sender_id == user.id else m.sender_id
        if partner_id not in last_message_by_partner:
            last_message_by_partner[partner_id] = (m.body, m.created_at)

    if not last_message_by_partner:
        return []

    partner_ids = list(last_message_by_partner.keys())

    # один батч-запрос на пользователей вместо обращения к m.sender/m.recipient
    # внутри цикла (ленивая загрузка — отдельный запрос на каждого нового собеседника)
    partners_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(partner_ids)).all()}

    # один агрегирующий запрос на непрочитанные вместо .count() внутри цикла (было:
    # отдельный SQL-запрос на каждого собеседника — тот же класс N+1, что уже
    # находили и чинили в communities.py и events.py)
    unread_rows = (
        db.query(Message.sender_id, func.count(Message.id))
        .filter(
            Message.sender_id.in_(partner_ids), Message.recipient_id == user.id, Message.is_read.is_(False)
        )
        .group_by(Message.sender_id)
        .all()
    )
    unread_by_partner = dict(unread_rows)

    conversations = []
    for partner_id, (last_body, last_at) in last_message_by_partner.items():
        partner = partners_by_id.get(partner_id)
        if not partner:
            continue  # собеседник успел удалить аккаунт — сообщения каскадно удалятся следом
        conversations.append(
            ConversationOut(
                partner=partner,
                last_message=last_body,
                last_message_at=last_at,
                unread_count=unread_by_partner.get(partner_id, 0),
            )
        )
    return conversations


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(Message).filter(Message.recipient_id == user.id, Message.is_read.is_(False)).count()
    return {"count": count}


@router.get("/{user_id}", response_model=list[MessageOut])
def get_thread(
    user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    partner = db.query(User).filter(User.id == user_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))

    # открыли беседу — отмечаем входящие от собеседника прочитанными. Делаем это
    # ДО загрузки сообщений для ответа: db.commit() по умолчанию истекает все
    # объекты в сессии (expire_on_commit=True) — если бы мы сначала загрузили
    # messages, а потом закоммитили update, каждое сообщение перезапрашивалось бы
    # отдельным запросом при сериализации ответа
    db.query(Message).filter(
        Message.sender_id == user_id, Message.recipient_id == user.id, Message.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()

    messages = (
        db.query(Message)
        .options(joinedload(Message.sender))
        .filter(
            or_(
                and_(Message.sender_id == user.id, Message.recipient_id == user_id),
                and_(Message.sender_id == user_id, Message.recipient_id == user.id),
            )
        )
        .order_by(Message.created_at)
        .all()
    )

    return messages


@router.post("/{user_id}", response_model=MessageOut)
def send_message(
    user_id: str, data: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail=t("cannot_message_self", lang))

    message_limiter.check(user.id)

    recipient = db.query(User).filter(User.id == user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail=t("user_not_found", lang))

    blocked = db.query(Block).filter(
        ((Block.blocker_id == user.id) & (Block.blocked_id == user_id))
        | ((Block.blocker_id == user_id) & (Block.blocked_id == user.id))
    ).first()
    if blocked:
        raise HTTPException(status_code=403, detail=t("cannot_message_this_user", lang))

    if not data.body.strip():
        raise HTTPException(status_code=400, detail=t("message_body_required", lang))

    message = Message(sender_id=user.id, recipient_id=user_id, body=data.body)
    db.add(message)
    db.commit()
    db.refresh(message)

    manager.notify_user_sync(user_id, {
        "type": "new_message",
        "from_user_id": user.id,
        "from_display_name": user.display_name,
        "body": data.body,
        "created_at": message.created_at.isoformat(),
    })
    return message
