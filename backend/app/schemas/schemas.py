from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------

class RegisterEmail(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)


class LoginEmail(BaseModel):
    email: EmailStr
    password: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=72)


class DeleteAccount(BaseModel):
    password: Optional[str] = None  # не нужен для Telegram-аккаунтов без пароля


class TelegramAuth(BaseModel):
    id: int
    first_name: str = Field(..., max_length=64)
    last_name: Optional[str] = Field(None, max_length=64)
    username: Optional[str] = Field(None, max_length=64)
    photo_url: Optional[str] = Field(None, max_length=500)
    auth_date: int
    hash: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- User ----------

class UserOut(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    city: str
    is_service_provider: bool

    model_config = ConfigDict(from_attributes=True)


class MeOut(UserOut):
    """Расширенная версия UserOut только для собственного /auth/me — is_admin не должен
    светиться в общей UserOut, которая отдаётся везде (автор поста/комментария и т.д.)."""

    is_admin: bool


# ---------- Pet ----------

class PetCreate(BaseModel):
    name: str = Field(..., max_length=80)
    species: str = Field(..., max_length=40)
    breed: Optional[str] = Field(None, max_length=80)
    gender: Optional[str] = Field(None, max_length=20)
    age_years: Optional[int] = Field(None, ge=0, le=100)
    city: Optional[str] = Field(None, max_length=80)
    activity_level: Optional[str] = Field(None, max_length=20)
    about: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)


class PetOut(PetCreate):
    id: str
    owner_id: str

    model_config = ConfigDict(from_attributes=True)


# ---------- Post ----------

class PostCreate(BaseModel):
    type: str
    title: str = Field(..., max_length=200)
    body: str = Field(..., max_length=5000)
    photo_url: Optional[str] = Field(None, max_length=500)
    last_seen_location: Optional[str] = Field(None, max_length=200)
    last_seen_lat: Optional[float] = None
    last_seen_lng: Optional[float] = None
    community_id: Optional[str] = None


class PostOut(BaseModel):
    id: str
    author: UserOut
    type: str
    title: str
    body: str
    photo_url: Optional[str] = None
    last_seen_location: Optional[str] = None
    last_seen_lat: Optional[float] = None
    last_seen_lng: Optional[float] = None
    is_resolved: bool
    created_at: datetime
    comments_count: int = 0
    is_saved: bool = False
    community_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    body: str = Field(..., max_length=1000)


class ReportCreate(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class CommentOut(BaseModel):
    id: str
    author: UserOut
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Services ----------

class ServiceProviderCreate(BaseModel):
    service_type: str
    description: str = Field(..., max_length=1000)
    price_from: Optional[int] = Field(None, ge=0, le=1_000_000)
    contact: Optional[str] = Field(None, max_length=200)


class ServiceProviderOut(BaseModel):
    id: str
    user: UserOut
    service_type: str
    description: str
    price_from: Optional[int] = None
    contact: Optional[str] = None
    rating_avg: float
    rating_count: int

    model_config = ConfigDict(from_attributes=True)


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    body: Optional[str] = Field(None, max_length=500)


class ReviewOut(BaseModel):
    id: str
    author: UserOut
    rating: int
    body: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    id: str
    type: str
    actor: UserOut
    post_id: Optional[str] = None
    post_title: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Admin ----------

class AdminActionResult(BaseModel):
    ok: bool = True


class AuditLogOut(BaseModel):
    id: str
    admin: Optional[UserOut] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminOverview(BaseModel):
    users_count: int
    posts_count: int
    pets_count: int
    unresolved_reports_count: int
    service_providers_count: int


# ---------- Communities ----------

class CommunityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    avatar_url: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=80)


class CommunityOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    creator: Optional[UserOut] = None
    members_count: int = 0
    is_member: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommunityMemberOut(BaseModel):
    user: UserOut
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Messages ----------

class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: str
    sender: UserOut
    recipient_id: str
    body: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationOut(BaseModel):
    partner: UserOut
    last_message: str
    last_message_at: datetime
    unread_count: int = 0


# ---------- Events / Walks ----------

class EventCreate(BaseModel):
    type: str  # walk / event
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=200)
    starts_at: datetime
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    pet_id: Optional[str] = None
    community_id: Optional[str] = None


class EventOut(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    starts_at: datetime
    capacity: Optional[int] = None
    organizer: UserOut
    pet_id: Optional[str] = None
    pet_name: Optional[str] = None
    community_id: Optional[str] = None
    participants_count: int = 0
    is_going: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventParticipantOut(BaseModel):
    user: UserOut
    status: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Health (приватно, только владелец питомца) ----------

class HealthRecordCreate(BaseModel):
    category: str  # vaccination / parasite / medication / weight / vet_visit
    title: str = Field(..., min_length=1, max_length=200)
    value: Optional[float] = None
    date: datetime
    next_due_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=1000)


class HealthRecordOut(BaseModel):
    id: str
    category: str
    title: str
    value: Optional[float] = None
    date: datetime
    next_due_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Marketplace ----------

class ListingCreate(BaseModel):
    type: str  # sell / wanted / give_away
    category: Optional[str] = Field(None, max_length=40)
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: Optional[int] = Field(None, ge=0)
    photo_url: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=80)


class ListingOut(BaseModel):
    id: str
    type: str
    category: Optional[str] = None
    title: str
    description: Optional[str] = None
    price: Optional[int] = None
    photo_url: Optional[str] = None
    city: Optional[str] = None
    is_sold: bool
    seller: UserOut
    is_saved: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportQueueItem(BaseModel):
    id: str
    reason: Optional[str] = None
    is_resolved: bool
    created_at: datetime
    reporter: UserOut
    post: Optional[PostOut] = None        # None, если пост уже удалён или жалоба не на пост
    listing: Optional[ListingOut] = None  # None, если объявление уже удалено или жалоба не на него

    model_config = ConfigDict(from_attributes=True)


# ---------- Sightings (раздел 17 — "видел питомца тут") ----------

class SightingCreate(BaseModel):
    location: str = Field(..., min_length=2, max_length=200)
    note: Optional[str] = Field(None, max_length=1000)
    seen_at: Optional[datetime] = None


class SightingOut(BaseModel):
    id: str
    reporter: UserOut
    location: str
    note: Optional[str] = None
    seen_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Blocks ----------

class BlockedUserOut(BaseModel):
    user: UserOut
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
