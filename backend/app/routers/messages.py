from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import RateLimiter
from app.core.security import get_current_user
from app.models.models import Message, User
from app.schemas.schemas import ConversationOut, MessageCreate, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])

message_limiter = RateLimiter(max_actions=30, window_seconds=600)  # 30 сообщений за 10 минут


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Список бесед — по одной строке на собеседника, с последним сообщением и
    счётчиком непрочитанных. Без отдельной таблицы Conversation: беседа выводится
    из уникальных пар (sender, recipient) в самих сообщениях."""
    rows = (
        db.query(Message)
        .filter(or_(Message.sender_id == user.id, Message.recipient_id == user.id))
        .order_by(desc(Message.created_at))
        .all()
    )

    seen_partners = set()
    conversations = []
    for m in rows:
        partner = m.recipient if m.sender_id == user.id else m.sender
        if partner.id in seen_partners:
            continue
        seen_partners.add(partner.id)

        unread_count = (
            db.query(Message)
            .filter(Message.sender_id == partner.id, Message.recipient_id == user.id, Message.is_read.is_(False))
            .count()
        )
        conversations.append(
            ConversationOut(
                partner=partner, last_message=m.body, last_message_at=m.created_at, unread_count=unread_count
            )
        )
    return conversations


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(Message).filter(Message.recipient_id == user.id, Message.is_read.is_(False)).count()
    return {"count": count}


@router.get("/{user_id}", response_model=list[MessageOut])
def get_thread(user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    partner = db.query(User).filter(User.id == user_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == user.id, Message.recipient_id == user_id),
                and_(Message.sender_id == user_id, Message.recipient_id == user.id),
            )
        )
        .order_by(Message.created_at)
        .all()
    )

    # открыли беседу — отмечаем входящие от собеседника прочитанными
    db.query(Message).filter(
        Message.sender_id == user_id, Message.recipient_id == user.id, Message.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()

    return messages


@router.post("/{user_id}", response_model=MessageOut)
def send_message(
    user_id: str, data: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя написать самому себе")

    message_limiter.check(user.id)

    recipient = db.query(User).filter(User.id == user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if not data.body.strip():
        raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")

    message = Message(sender_id=user.id, recipient_id=user_id, body=data.body)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
