from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import listing_limiter
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import Listing, SavedListing, User
from app.schemas.schemas import ListingCreate, ListingOut

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

LISTING_TYPES = {"sell", "wanted", "give_away"}


def _to_out(listing: Listing, saved_ids: set[str]) -> ListingOut:
    out = ListingOut.model_validate(listing)
    out.is_saved = listing.id in saved_ids
    return out


@router.get("", response_model=list[ListingOut])
def list_listings(
    type: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    include_sold: bool = False,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Listing)
    if not include_sold:
        query = query.filter(Listing.is_sold.is_(False))
    if type:
        query = query.filter(Listing.type == type)
    if category:
        query = query.filter(Listing.category == category)
    if city:
        query = query.filter(Listing.city == city)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Listing.title.ilike(pattern), Listing.description.ilike(pattern)))
    listings = query.order_by(desc(Listing.created_at)).offset(offset).limit(limit).all()

    saved_ids = set()
    if user and listings:
        listing_ids = [l.id for l in listings]
        saved_ids = {
            row.listing_id
            for row in db.query(SavedListing.listing_id)
            .filter(SavedListing.user_id == user.id, SavedListing.listing_id.in_(listing_ids))
            .all()
        }
    return [_to_out(l, saved_ids) for l in listings]


@router.get("/saved", response_model=list[ListingOut])
def list_saved_listings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    saved_listing_ids = [
        row.listing_id
        for row in db.query(SavedListing.listing_id)
        .filter(SavedListing.user_id == user.id)
        .order_by(desc(SavedListing.created_at))
        .all()
    ]
    if not saved_listing_ids:
        return []
    listings_by_id = {l.id: l for l in db.query(Listing).filter(Listing.id.in_(saved_listing_ids)).all()}
    saved_set = set(saved_listing_ids)
    ordered = [listings_by_id[lid] for lid in saved_listing_ids if lid in listings_by_id]
    return [_to_out(l, saved_set) for l in ordered]


@router.post("", response_model=ListingOut)
def create_listing(data: ListingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    listing_limiter.check(user.id)

    if data.type not in LISTING_TYPES:
        raise HTTPException(status_code=400, detail=f"Тип должен быть одним из {sorted(LISTING_TYPES)}")
    if data.type == "sell" and data.price is None:
        raise HTTPException(status_code=400, detail="Для продажи нужно указать цену")

    listing = Listing(seller_id=user.id, **data.model_dump())
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _to_out(listing, set())


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(
    listing_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    saved_ids = set()
    if user:
        exists = db.query(SavedListing).filter(
            SavedListing.user_id == user.id, SavedListing.listing_id == listing_id
        ).first()
        if exists:
            saved_ids = {listing_id}
    return _to_out(listing, saved_ids)


@router.patch("/{listing_id}/mark-sold", response_model=ListingOut)
def mark_sold(listing_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if listing.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Можно отметить проданным только своё объявление")

    listing.is_sold = True
    db.commit()
    db.refresh(listing)
    return _to_out(listing, set())


@router.delete("/{listing_id}")
def delete_listing(listing_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    if listing.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Можно удалить только своё объявление")

    db.delete(listing)
    db.commit()
    return {"ok": True}


@router.post("/{listing_id}/save")
def save_listing(listing_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Объявление не найдено")

    exists = db.query(SavedListing).filter(
        SavedListing.user_id == user.id, SavedListing.listing_id == listing_id
    ).first()
    if exists:
        return {"ok": True}

    db.add(SavedListing(user_id=user.id, listing_id=listing_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # параллельный запрос успел сохранить — не ошибка
    return {"ok": True}


@router.delete("/{listing_id}/save")
def unsave_listing(listing_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(SavedListing).filter(
        SavedListing.user_id == user.id, SavedListing.listing_id == listing_id
    ).delete()
    db.commit()
    return {"ok": True}
