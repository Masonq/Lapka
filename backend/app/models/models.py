import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, Float, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.db import Base


def gen_uuid():
    return str(uuid.uuid4())


class PostType(str, enum.Enum):
    LOST = "lost"          # потеряшка
    FOUND = "found"        # найден
    ADOPT = "adopt"        # пристройство
    QUESTION = "question"  # вопрос
    GENERAL = "general"    # общий пост


class ServiceType(str, enum.Enum):
    SITTER = "sitter"        # ситтер
    BOARDING = "boarding"    # передержка
    TRAINER = "trainer"      # кинолог
    VET = "vet"               # ветеринар
    GROOMER = "groomer"      # грумер


class AuthProvider(str, enum.Enum):
    TELEGRAM = "telegram"
    EMAIL = "email"
    PHONE = "phone"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    display_name = Column(String(80), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(String(300), nullable=True)

    auth_provider = Column(Enum(AuthProvider), nullable=False)
    telegram_id = Column(String(64), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(32), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)

    city = Column(String(80), default="Beograd")
    is_service_provider = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    pets = relationship("Pet", back_populates="owner", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    service_profile = relationship("ServiceProvider", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(80), nullable=False)
    species = Column(String(40), nullable=False)   # собака / кошка / другое
    breed = Column(String(80), nullable=True)
    gender = Column(String(20), nullable=True)      # мальчик / девочка
    age_years = Column(Integer, nullable=True)
    city = Column(String(80), nullable=True)
    activity_level = Column(String(20), nullable=True)  # спокойный / средний / активный
    about = Column(String(500), nullable=True)      # характер, интересы — свободным текстом
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="pets")


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(PostType), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    photo_url = Column(String(500), nullable=True)

    # для потеряшек/найденных
    last_seen_location = Column(String(200), nullable=True)
    last_seen_lat = Column(Float, nullable=True)
    last_seen_lng = Column(Float, nullable=True)
    is_resolved = Column(Boolean, default=False)  # нашёлся / пристроен

    community_id = Column(UUID(as_uuid=False), ForeignKey("communities.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    author = relationship("User", back_populates="posts")
    community = relationship("Community")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    post_id = Column(UUID(as_uuid=False), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(String(1000), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    post = relationship("Post", back_populates="comments")
    author = relationship("User")


class ServiceProvider(Base):
    __tablename__ = "service_providers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    service_type = Column(Enum(ServiceType), nullable=False)
    description = Column(String(1000), nullable=False)
    price_from = Column(Integer, nullable=True)  # в динарах
    contact = Column(String(200), nullable=True)
    rating_avg = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)

    user = relationship("User", back_populates="service_profile")
    reviews = relationship("ServiceReview", back_populates="provider", cascade="all, delete-orphan")


class ServiceReview(Base):
    __tablename__ = "service_reviews"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    provider_id = Column(UUID(as_uuid=False), ForeignKey("service_providers.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1..5
    body = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    provider = relationship("ServiceProvider", back_populates="reviews")
    author = relationship("User")


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    follower_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SavedPost(Base):
    __tablename__ = "saved_posts"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_user_saved_post"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=False), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Report(Base):
    """Жалоба на пост или объявление барахолки (ровно одно из двух). Разбирает админка
    (разделы 24-25 блюпринта) — см. admin.py."""

    __tablename__ = "reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    reporter_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=False), ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    listing_id = Column(UUID(as_uuid=False), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True)
    reason = Column(String(500), nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    reporter = relationship("User")
    post = relationship("Post")
    listing = relationship("Listing")


class AuditLog(Base):
    """Журнал действий модерации — раздел 24 блюпринта. Кто, что и над чем сделал."""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    admin_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)   # resolve_report / delete_post / dismiss_report
    target_type = Column(String(30), nullable=False)  # post / report / user
    target_id = Column(String(64), nullable=True)  # не FK — цель может быть уже удалена к моменту чтения лога
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    admin = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)   # получатель
    actor_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # кто вызвал событие
    type = Column(String(20), nullable=False)  # follow / comment
    post_id = Column(UUID(as_uuid=False), ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    actor = relationship("User", foreign_keys=[actor_id])
    post = relationship("Post")


class Community(Base):
    __tablename__ = "communities"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    description = Column(String(1000), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    city = Column(String(80), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User")
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")


class CommunityMember(Base):
    __tablename__ = "community_members"
    __table_args__ = (UniqueConstraint("community_id", "user_id", name="uq_community_member"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    community_id = Column(UUID(as_uuid=False), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="member")  # member / moderator / admin
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    community = relationship("Community", back_populates="members")
    user = relationship("User")


class Message(Base):
    """Личное сообщение 1:1 — раздел 14 блюпринта. Групповые чаты и realtime (WebSocket)
    пока не реализованы: доставка через polling, тем же способом, что и уведомления."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    sender_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(String(2000), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])


class Event(Base):
    """Прогулка или событие — разделы 15-16 блюпринта объединены в одну модель:
    структурно это одно и то же (дата/время/место/участники), разница только в том,
    что у прогулки указывается конкретный питомец, а у события — нет."""

    __tablename__ = "events"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organizer_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # walk / event
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=True)
    location = Column(String(200), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, nullable=True)
    pet_id = Column(UUID(as_uuid=False), ForeignKey("pets.id", ondelete="SET NULL"), nullable=True)
    community_id = Column(UUID(as_uuid=False), ForeignKey("communities.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organizer = relationship("User")
    pet = relationship("Pet")
    community = relationship("Community")
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")


class EventParticipant(Base):
    __tablename__ = "event_participants"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_participant"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = Column(UUID(as_uuid=False), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="going")  # going / interested
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="participants")
    user = relationship("User")


class HealthRecord(Base):
    """Медицинская запись питомца — раздел 19 блюпринта. Приватно по умолчанию: доступ
    только владельцу питомца (проверяется в роутере), никогда не попадает в ленту/
    рекомендации — блюпринт прямо это требует."""

    __tablename__ = "health_records"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    pet_id = Column(UUID(as_uuid=False), ForeignKey("pets.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(30), nullable=False)  # vaccination / parasite / medication / weight / vet_visit
    title = Column(String(200), nullable=False)   # название прививки/лекарства/клиники
    value = Column(Float, nullable=True)            # для веса — кг
    date = Column(DateTime(timezone=True), nullable=False)
    next_due_date = Column(DateTime(timezone=True), nullable=True)  # для напоминаний
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    pet = relationship("Pet")


class Listing(Base):
    """Объявление барахолки — раздел 20 блюпринта. Категории Wanted/Sell/Give away
    из типа объявления, а не отдельного домена."""

    __tablename__ = "listings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    seller_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # sell / wanted / give_away
    category = Column(String(40), nullable=True)  # корм / игрушки / аксессуары / переноски / другое
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=True)
    price = Column(Integer, nullable=True)  # в динарах; пусто для wanted/give_away
    photo_url = Column(String(500), nullable=True)
    city = Column(String(80), nullable=True)
    is_sold = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    seller = relationship("User")


class SavedListing(Base):
    __tablename__ = "saved_listings"
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_user_saved_listing"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    listing_id = Column(UUID(as_uuid=False), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Sighting(Base):
    """'Видел питомца тут' — структурированное сообщение к посту lost/found, раздел 17
    блюпринта ('Sighting report'). Отдельно от комментариев: у sighting есть место и
    время наблюдения, а не просто текст — это то, что реально помогает искать животное,
    и то, ради чего весь проект изначально начинался (t.me/kuce_beograd)."""

    __tablename__ = "sightings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    post_id = Column(UUID(as_uuid=False), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    reporter_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    location = Column(String(200), nullable=False)
    note = Column(String(1000), nullable=True)
    seen_at = Column(DateTime(timezone=True), nullable=True)  # когда видели, если не сейчас
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    reporter = relationship("User")


class Block(Base):
    """Блокировка пользователя — раздел 22 блюпринта. Двусторонняя по эффекту:
    заблокированный не может написать блокирующему, и наоборот (чтобы случайно
    не написать тому, кого сам заблокировал)."""

    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id", name="uq_blocker_blocked"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    blocker_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    blocked = relationship("User", foreign_keys=[blocked_id])
