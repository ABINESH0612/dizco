from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Category
from app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryOut
from app.api.auth import get_current_admin

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active == True).order_by(Category.display_order.asc()).all()

@router.get("/all", response_model=List[CategoryOut])
def list_all_categories_admin(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    return db.query(Category).order_by(Category.display_order.asc()).all()

@router.get("/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category

@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    existing = db.query(Category).filter(
        (Category.name == cat_in.name) | (Category.slug == cat_in.slug)
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category with this name or slug already exists")
    
    category = Category(**cat_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/{cat_id}", response_model=CategoryOut)
def update_category(
    cat_id: int,
    cat_in: CategoryUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    update_data = cat_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(category, key, val)
        
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{cat_id}")
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
