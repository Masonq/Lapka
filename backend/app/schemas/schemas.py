from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


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
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
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

    class Config:
        from_attributes = True


# ---------- Pet ----------

class PetCreate(BaseModel):
    name: str = Field(..., max_length=80)
    species: str = Field(..., max_length=40)
    breed: Optional[str] = None
    age_years: Optional[int] = None
    about: Optional[str] = None
    avatar_url: Optional[str] = None


class PetOut(PetCreate):
    id: str
    owner_id: str

    class Config:
        from_attributes = True


# ---------- Post ----------

class PostCreate(BaseModel):
    type: str
    title: str = Field(..., max_length=200)
    body: str
    photo_url: Optional[str] = None
    last_seen_location: Optional[str] = None
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

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    body: str = Field(..., max_length=1000)


class CommentOut(BaseModel):
    id: str
    author: UserOut
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Services ----------

class ServiceProviderCreate(BaseModel):
    service_type: str
    description: str = Field(..., max_length=1000)
    price_from: Optional[int] = None
    contact: Optional[str] = None


class ServiceProviderOut(BaseModel):
    id: str
    user: UserOut
    service_type: str
    description: str
    price_from: Optional[int] = None
    contact: Optional[str] = None
    rating_avg: float
    rating_count: int

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    body: Optional[str] = None
