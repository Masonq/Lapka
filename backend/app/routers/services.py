from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import provider_limiter, review_limiter
from app.core.security import get_current_user
from app.models.models import ServiceProvider, ServiceReview, ServiceType, User
from app.schemas.schemas import ReviewCreate, ReviewOut, ServiceProviderCreate, ServiceProviderOut

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=list[ServiceProviderOut])
def list_providers(type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ServiceProvider)
    if type:
        try:
            q = q.filter(ServiceProvider.service_type == ServiceType(type))
        except ValueError:
            raise HTTPException(status_code=400, detail="Неизвестный тип услуги")
    return q.order_by(ServiceProvider.rating_avg.desc()).all()


@router.post("", response_model=ServiceProviderOut)
def become_provider(
    data: ServiceProviderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    provider_limiter.check(user.id)
    if user.service_profile:
        raise HTTPException(status_code=400, detail="Профиль исполнителя уже создан")
    try:
        service_type = ServiceType(data.service_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неизвестный тип услуги")

    provider = ServiceProvider(
        user_id=user.id,
        service_type=service_type,
        description=data.description,
        price_from=data.price_from,
        contact=data.contact,
    )
    user.is_service_provider = True
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@router.get("/{provider_id}/reviews", response_model=list[ReviewOut])
def list_reviews(provider_id: str, db: Session = Depends(get_db)):
    return (
        db.query(ServiceReview)
        .filter(ServiceReview.provider_id == provider_id)
        .order_by(ServiceReview.created_at.desc())
        .all()
    )


@router.post("/{provider_id}/reviews", response_model=ServiceProviderOut)
def leave_review(
    provider_id: str,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    review_limiter.check(user.id)

    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Исполнитель не найден")
    if provider.user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя оставить отзыв самому себе")

    existing = (
        db.query(ServiceReview)
        .filter(ServiceReview.provider_id == provider_id, ServiceReview.author_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ты уже оставлял отзыв этому исполнителю")

    review = ServiceReview(provider_id=provider_id, author_id=user.id, rating=data.rating, body=data.body)
    db.add(review)

    total = provider.rating_avg * provider.rating_count + data.rating
    provider.rating_count += 1
    provider.rating_avg = round(total / provider.rating_count, 2)

    db.commit()
    db.refresh(provider)
    return provider
