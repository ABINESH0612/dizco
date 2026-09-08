from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import ContentPage, StoreSetting
from app.schemas.schemas import (
    ContentPageOut, ContentPageUpdate, StoreSettingOut, StoreSettingUpdate
)
from app.api.auth import get_current_admin

router = APIRouter(prefix="/cms", tags=["CMS & Settings"])

@router.get("/pages", response_model=List[ContentPageOut])
def get_all_pages(db: Session = Depends(get_db)):
    return db.query(ContentPage).all()

@router.get("/pages/{slug}", response_model=ContentPageOut)
def get_page(slug: str, db: Session = Depends(get_db)):
    page = db.query(ContentPage).filter(ContentPage.slug == slug).first()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return page

@router.put("/pages/{slug}", response_model=ContentPageOut)
def update_page(
    slug: str,
    page_in: ContentPageUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    page = db.query(ContentPage).filter(ContentPage.slug == slug).first()
    if not page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    
    page.title = page_in.title
    page.content = page_in.content
    db.commit()
    db.refresh(page)
    return page

@router.get("/settings", response_model=List[StoreSettingOut])
def get_settings(db: Session = Depends(get_db)):
    return db.query(StoreSetting).all()

@router.put("/settings/{key}", response_model=StoreSettingOut)
def update_setting(
    key: str,
    setting_in: StoreSettingUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    setting = db.query(StoreSetting).filter(StoreSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    
    setting.value = setting_in.value
    db.commit()
    db.refresh(setting)
    return setting
