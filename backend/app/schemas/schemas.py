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


# ---------- Pet ----------

class PetCreate(BaseModel):
    name: str = Field(..., max_length=80)
    species: str = Field(..., max_length=40)
    breed: Optional[str] = Field(None, max_length=80)
    age_years: Optional[int] = Field(None, ge=0, le=100)
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

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    body: str = Field(..., max_length=1000)


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
