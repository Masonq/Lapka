from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.rate_limit import pet_limiter
from app.core.security import get_current_user
from app.models.models import Pet, User
from app.schemas.schemas import PetCreate, PetOut

router = APIRouter(prefix="/api/pets", tags=["pets"])


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
