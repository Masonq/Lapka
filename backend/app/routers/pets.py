from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import RateLimiter, pet_limiter
from app.core.security import get_current_user
from app.models.models import HealthRecord, Pet, User
from app.schemas.schemas import HealthRecordCreate, HealthRecordOut, PetCreate, PetOut

router = APIRouter(prefix="/api/pets", tags=["pets"])

health_limiter = RateLimiter(max_actions=20, window_seconds=3600)  # 20 записей в час на пользователя
HEALTH_CATEGORIES = {"vaccination", "parasite", "medication", "weight", "vet_visit"}


@router.get("", response_model=list[PetOut])
def list_pets(
    city: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Публичный список питомцев — раздел 11 блюпринта (Nearby) и раздел 10 (Search).
    Фильтр по городу, не по точным координатам: их у питомцев и пользователей нет и
    не будет — блюпринт прямо запрещает показывать точное местоположение."""
    query = db.query(Pet)
    if city:
        query = query.filter(Pet.city == city)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Pet.name.ilike(pattern), Pet.breed.ilike(pattern)))
    return query.order_by(Pet.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/mine", response_model=list[PetOut])
def my_pets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Pet).filter(Pet.owner_id == user.id).all()


@router.get("/user/{user_id}", response_model=list[PetOut])
def pets_of_user(user_id: str, db: Session = Depends(get_db)):
    return db.query(Pet).filter(Pet.owner_id == user_id).all()


@router.post("", response_model=PetOut)
def create_pet(data: PetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pet_limiter.check(user.id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Кличка не может быть пустой")

    pet = Pet(owner_id=user.id, **data.model_dump())
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetOut)
def get_pet(pet_id: str, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    return pet


@router.delete("/{pet_id}")
def delete_pet(pet_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Можно удалить только своего питомца")
    db.delete(pet)
    db.commit()
    return {"ok": True}


def _owned_pet_or_403(pet_id: str, db: Session, user: User) -> Pet:
    """Здоровье питомца приватно по умолчанию — доступ только владельцу (раздел 19
    блюпринта). 404 для несуществующего питомца, 403 для чужого — не путаем чужой
    питомец с несуществующим, чтобы не давать функционально спутать эти два случая."""
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Питомец не найден")
    if pet.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Здоровье питомца видит только владелец")
    return pet


@router.get("/{pet_id}/health", response_model=list[HealthRecordOut])
def list_health_records(pet_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _owned_pet_or_403(pet_id, db, user)
    return (
        db.query(HealthRecord)
        .filter(HealthRecord.pet_id == pet_id)
        .order_by(desc(HealthRecord.date))
        .all()
    )


@router.post("/{pet_id}/health", response_model=HealthRecordOut)
def add_health_record(
    pet_id: str, data: HealthRecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _owned_pet_or_403(pet_id, db, user)
    health_limiter.check(user.id)

    if data.category not in HEALTH_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Неизвестная категория: должна быть одной из {sorted(HEALTH_CATEGORIES)}")

    record = HealthRecord(pet_id=pet_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{pet_id}/health/{record_id}")
def delete_health_record(
    pet_id: str, record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _owned_pet_or_403(pet_id, db, user)
    record = db.query(HealthRecord).filter(HealthRecord.id == record_id, HealthRecord.pet_id == pet_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(record)
    db.commit()
    return {"ok": True}
