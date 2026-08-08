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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    pets = relationship("Pet", back_populates="owner", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    service_profile = relationship("ServiceProvider", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    name = Column(String(80), nullable=False)
    species = Column(String(40), nullable=False)   # собака / кошка / другое
    breed = Column(String(80), nullable=True)
    age_years = Column(Integer, nullable=True)
    about = Column(String(500), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="pets")


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    type = Column(Enum(PostType), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    photo_url = Column(String(500), nullable=True)

    # для потеряшек/найденных
    last_seen_location = Column(String(200), nullable=True)
    last_seen_lat = Column(Float, nullable=True)
    last_seen_lng = Column(Float, nullable=True)
    is_resolved = Column(Boolean, default=False)  # нашёлся / пристроен

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    post_id = Column(UUID(as_uuid=False), ForeignKey("posts.id"), nullable=False)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    body = Column(String(1000), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    post = relationship("Post", back_populates="comments")
    author = relationship("User")


class ServiceProvider(Base):
    __tablename__ = "service_providers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)
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
    provider_id = Column(UUID(as_uuid=False), ForeignKey("service_providers.id"), nullable=False)
    author_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1..5
    body = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    provider = relationship("ServiceProvider", back_populates="reviews")
    author = relationship("User")


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),)

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    follower_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    following_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
