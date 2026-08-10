from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.i18n import get_lang, t
from app.core.rate_limit import provider_limiter, review_limiter
from app.core.security import get_current_user
from app.models.models import ServiceProvider, ServiceReview, ServiceType, User
from app.schemas.schemas import ReviewCreate, ReviewOut, ServiceProviderCreate, ServiceProviderOut

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=list[ServiceProviderOut])
def list_providers(type: Optional[str] = None, db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    q = db.query(ServiceProvider).options(joinedload(ServiceProvider.user))
    if type:
        try:
            q = q.filter(ServiceProvider.service_type == ServiceType(type))
        except ValueError:
            raise HTTPException(status_code=400, detail=t("unknown_service_type", lang))
    return q.order_by(ServiceProvider.rating_avg.desc()).all()


@router.post("", response_model=ServiceProviderOut)
def become_provider(
    data: ServiceProviderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
    lang: str = Depends(get_lang),
):
    provider_limiter.check(user.id)
    if user.service_profile:
        raise HTTPException(status_code=400, detail=t("provider_profile_already_exists", lang))
    try:
        service_type = ServiceType(data.service_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=t("unknown_service_type", lang))

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
        .options(joinedload(ServiceReview.author))
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
    lang: str = Depends(get_lang),
):
    review_limiter.check(user.id)

    provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail=t("provider_not_found", lang))
    if provider.user_id == user.id:
        raise HTTPException(status_code=400, detail=t("cannot_review_self", lang))

    existing = (
        db.query(ServiceReview)
        .filter(ServiceReview.provider_id == provider_id, ServiceReview.author_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=t("already_reviewed_provider", lang))

    review = ServiceReview(provider_id=provider_id, author_id=user.id, rating=data.rating, body=data.body)
    db.add(review)

    total = provider.rating_avg * provider.rating_count + data.rating
    provider.rating_count += 1
    provider.rating_avg = round(total / provider.rating_count, 2)

    db.commit()
    db.refresh(provider)
    return provider
