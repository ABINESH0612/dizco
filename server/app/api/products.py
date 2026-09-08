import os
import uuid
import math
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Product, ProductImage, ProductVariant, Category, Review
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductOut, ProductPagination, ProductImageOut,
    ProductVariantCreate, ProductVariantUpdate, ProductVariantOut
)
from app.api.auth import get_current_admin
from app.services.cloudinary_service import cloudinary_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Products & Inventory"])

def _enrich_product_rating(product: Product, db: Session):
    """Calculates approved average rating and review count for product response."""
    stats = db.query(
        func.avg(Review.rating),
        func.count(Review.id)
    ).filter(
        Review.product_id == product.id,
        Review.status == "approved"
    ).first()

    avg_rating = round(float(stats[0]), 1) if stats and stats[0] is not None else None
    count = int(stats[1]) if stats and stats[1] is not None else 0

    product.average_rating = avg_rating
    product.review_count = count
    return product

@router.get("", response_model=ProductPagination)
def list_products(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = Query("newest", pattern="^(newest|price_asc|price_desc|name_asc)$"),
    all_status: bool = False
):
    query = db.query(Product)
    
    # Storefront customers only see published and active items
    if not all_status:
        query = query.filter(Product.is_active == True, Product.is_published == True)
        
    if category:
        query = query.join(Product.category).filter(Category.slug == category)
        
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_fmt),
                Product.description.ilike(search_fmt),
                Product.sku.ilike(search_fmt)
            )
        )
        
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
        
    if sort == "newest":
        query = query.order_by(desc(Product.created_at))
    elif sort == "price_asc":
        query = query.order_by(asc(Product.price))
    elif sort == "price_desc":
        query = query.order_by(desc(Product.price))
    elif sort == "name_asc":
        query = query.order_by(asc(Product.name))

    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()
    pages = math.ceil(total / limit) if total > 0 else 1

    for prod in items:
        _enrich_product_rating(prod, db)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }

@router.get("/featured", response_model=List[ProductOut])
def get_featured_products(limit: int = 8, db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.is_published == True
    ).order_by(desc(Product.created_at)).limit(limit).all()
    for prod in products:
        _enrich_product_rating(prod, db)
    return products

@router.get("/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    if slug.isdigit():
        product = db.query(Product).filter((Product.id == int(slug)) | (Product.slug == slug)).first()
    else:
        product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    _enrich_product_rating(product, db)
    return product

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    existing_sku = db.query(Product).filter(Product.sku == prod_in.sku).first()
    if existing_sku:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")
    
    existing_slug = db.query(Product).filter(Product.slug == prod_in.slug).first()
    if existing_slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")

    product = Product(
        name=prod_in.name,
        slug=prod_in.slug,
        sku=prod_in.sku,
        description=prod_in.description,
        price=prod_in.price,
        sale_price=prod_in.sale_price,
        stock_quantity=prod_in.stock_quantity,
        category_id=prod_in.category_id,
        is_active=prod_in.is_active,
        is_published=prod_in.is_published
    )
    db.add(product)
    db.flush()

    # Add images if provided
    for idx, img_url in enumerate(prod_in.images or []):
        pimg = ProductImage(
            product_id=product.id,
            image_url=img_url,
            is_primary=(idx == 0),
            display_order=idx
        )
        db.add(pimg)

    db.commit()
    db.refresh(product)
    _enrich_product_rating(product, db)
    return product

@router.put("/{prod_id}", response_model=ProductOut)
def update_product(
    prod_id: int,
    prod_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == prod_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    update_data = prod_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(product, key, val)
        
    db.commit()
    db.refresh(product)
    _enrich_product_rating(product, db)
    return product

@router.delete("/{prod_id}")
def delete_product(
    prod_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == prod_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    # Clean up associated Cloudinary assets before DB deletion
    for img in product.images or []:
        if img.public_id:
            cloudinary_service.delete_image(img.public_id)

    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

# ==========================================
# Cloudinary Image Uploads & Management
# ==========================================
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 # 5 MB limit

@router.post("/{prod_id}/images", response_model=ProductImageOut)
async def upload_product_image(
    prod_id: int,
    file: UploadFile = File(...),
    is_primary: bool = False,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == prod_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # 1. Validate MIME type and file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if file.content_type not in ALLOWED_MIME_TYPES or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format '{file.content_type}'. Allowed types: JPG, PNG, WEBP."
        )

    # 2. Validate file size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds maximum limit of 5MB."
        )

    # 3. Check max images
    img_count = db.query(ProductImage).filter(ProductImage.product_id == prod_id).count()
    if img_count >= 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 8 images allowed per garment")

    # 4. Upload using Cloudinary service with graceful local fallback
    upload_result = cloudinary_service.upload_image(
        content, 
        file.filename,
        folder=f"dizco/products/{prod_id}"
    )

    pimg = ProductImage(
        product_id=prod_id,
        image_url=upload_result["image_url"],
        public_id=upload_result.get("public_id"),
        is_primary=is_primary or (img_count == 0),
        display_order=img_count
    )
    db.add(pimg)
    db.commit()
    db.refresh(pimg)
    return pimg

@router.put("/images/{img_id}", response_model=ProductImageOut)
async def replace_product_image(
    img_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Replaces an existing product image with a newly uploaded file.
    Safely deletes the old Cloudinary asset after successful upload.
    """
    pimg = db.query(ProductImage).filter(ProductImage.id == img_id).first()
    if not pimg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if file.content_type not in ALLOWED_MIME_TYPES or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format '{file.content_type}'. Allowed types: JPG, PNG, WEBP."
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds maximum limit of 5MB."
        )

    upload_result = cloudinary_service.replace_image(
        content,
        file.filename,
        old_public_id=pimg.public_id,
        folder=f"dizco/products/{pimg.product_id}"
    )

    pimg.image_url = upload_result["image_url"]
    pimg.public_id = upload_result.get("public_id")
    db.commit()
    db.refresh(pimg)
    return pimg

@router.put("/images/{img_id}/primary", response_model=ProductImageOut)
def set_primary_product_image(
    img_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """Sets the designated product image as the primary image for the garment."""
    pimg = db.query(ProductImage).filter(ProductImage.id == img_id).first()
    if not pimg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    # Clear is_primary on all other images of this product
    db.query(ProductImage).filter(
        ProductImage.product_id == pimg.product_id,
        ProductImage.id != img_id
    ).update({"is_primary": False})

    pimg.is_primary = True
    db.commit()
    db.refresh(pimg)
    return pimg

@router.delete("/images/{img_id}")
def delete_product_image(
    img_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    pimg = db.query(ProductImage).filter(ProductImage.id == img_id).first()
    if not pimg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    
    # Delete from Cloudinary if stored there
    if pimg.public_id:
        cloudinary_service.delete_image(pimg.public_id)

    db.delete(pimg)
    db.commit()
    return {"message": "Image deleted successfully"}

# ==========================================
# Product Variants (Tier-2: Color -> Size)
# ==========================================
@router.post("/{prod_id}/variants", response_model=ProductVariantOut, status_code=status.HTTP_201_CREATED)
def create_product_variant(
    prod_id: int,
    variant_in: ProductVariantCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    product = db.query(Product).filter(Product.id == prod_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing_sku = db.query(ProductVariant).filter(ProductVariant.sku == variant_in.sku).first()
    if existing_sku:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variant SKU '{variant_in.sku}' already exists.")

    variant = ProductVariant(
        product_id=prod_id,
        sku=variant_in.sku,
        color=variant_in.color.strip(),
        size=variant_in.size.strip().upper(),
        price=variant_in.price,
        stock_quantity=variant_in.stock_quantity,
        is_active=variant_in.is_active
    )
    db.add(variant)
    
    # Keep product total stock synced
    product.stock_quantity += variant_in.stock_quantity

    db.commit()
    db.refresh(variant)
    return variant

@router.put("/variants/{variant_id}", response_model=ProductVariantOut)
def update_product_variant(
    variant_id: int,
    variant_in: ProductVariantUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    update_data = variant_in.model_dump(exclude_unset=True)
    if "size" in update_data and update_data["size"]:
        update_data["size"] = update_data["size"].strip().upper()
    if "color" in update_data and update_data["color"]:
        update_data["color"] = update_data["color"].strip()

    for k, v in update_data.items():
        setattr(variant, k, v)

    db.commit()
    db.refresh(variant)

    # Recompute total product stock
    product = db.query(Product).filter(Product.id == variant.product_id).first()
    if product and product.variants:
        product.stock_quantity = sum(v.stock_quantity for v in product.variants if v.is_active)
        db.commit()

    return variant

@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    prod_id = variant.product_id
    db.delete(variant)
    db.commit()

    # Recompute total product stock
    product = db.query(Product).filter(Product.id == prod_id).first()
    if product and product.variants:
        product.stock_quantity = sum(v.stock_quantity for v in product.variants if v.is_active)
        db.commit()

    return None
