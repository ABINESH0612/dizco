from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.models import Review, Product, Order, OrderItem, User
from app.schemas.schemas import (
    ReviewCreate, ReviewUpdate, ReviewStatusUpdate, ReviewOut, ProductReviewsSummaryOut
)
from app.api.auth import get_current_user, get_current_admin

router = APIRouter(tags=["Product Reviews"])

# ==========================================
# Public Endpoints
# ==========================================
@router.get("/products/{slug}/reviews", response_model=ProductReviewsSummaryOut)
def get_product_reviews(
    slug: str,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Only approved reviews are public
    approved_query = db.query(Review).filter(
        Review.product_id == product.id,
        Review.status == "approved"
    )

    total_reviews = approved_query.count()
    avg_rating = db.query(func.avg(Review.rating)).filter(
        Review.product_id == product.id,
        Review.status == "approved"
    ).scalar() or 0.0

    reviews = approved_query.order_by(desc(Review.created_at)).all()

    rev_list = []
    for r in reviews:
        rev_list.append({
            "id": r.id,
            "product_id": r.product_id,
            "user_id": r.user_id,
            "user_name": r.user.full_name if r.user else "Verified Client",
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "status": r.status,
            "is_verified_purchase": r.is_verified_purchase,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })

    return {
        "average_rating": round(float(avg_rating), 1),
        "total_reviews": total_reviews,
        "reviews": rev_list
    }

# ==========================================
# Customer Endpoints
# ==========================================
@router.get("/products/{product_id}/my-review", response_model=Optional[ReviewOut])
def get_my_review_for_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(Review).filter(
        Review.product_id == product_id,
        Review.user_id == current_user.id
    ).first()
    if not r:
        return None

    return {
        "id": r.id,
        "product_id": r.product_id,
        "user_id": r.user_id,
        "user_name": current_user.full_name,
        "rating": r.rating,
        "title": r.title,
        "comment": r.comment,
        "status": r.status,
        "is_verified_purchase": r.is_verified_purchase,
        "created_at": r.created_at,
        "updated_at": r.updated_at
    }

@router.post("/products/{product_id}/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def submit_review(
    product_id: int,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # 1. Prevent users from reviewing products they have not purchased
    has_purchased = db.query(OrderItem).join(Order, OrderItem.order_id == Order.id).filter(
        Order.user_id == current_user.id,
        OrderItem.product_id == product_id,
        Order.payment_status == "paid"
    ).first() is not None

    if not has_purchased:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verified purchase required. You may only review garments you have purchased."
        )

    # 2. Check if review already exists
    existing = db.query(Review).filter(
        Review.product_id == product_id,
        Review.user_id == current_user.id
    ).first()

    if existing:
        # Update existing review
        existing.rating = review_in.rating
        existing.title = review_in.title
        existing.comment = review_in.comment
        existing.status = "pending" # Needs admin re-approval
        db.commit()
        db.refresh(existing)
        rev = existing
    else:
        rev = Review(
            product_id=product_id,
            user_id=current_user.id,
            rating=review_in.rating,
            title=review_in.title,
            comment=review_in.comment,
            status="pending",
            is_verified_purchase=True
        )
        db.add(rev)
        db.commit()
        db.refresh(rev)

    return {
        "id": rev.id,
        "product_id": rev.product_id,
        "user_id": rev.user_id,
        "user_name": current_user.full_name,
        "rating": rev.rating,
        "title": rev.title,
        "comment": rev.comment,
        "status": rev.status,
        "is_verified_purchase": rev.is_verified_purchase,
        "created_at": rev.created_at,
        "updated_at": rev.updated_at
    }

@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_own_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rev = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()
    if not rev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found or unauthorized")
    db.delete(rev)
    db.commit()
    return None

# ==========================================
# Admin Moderation Endpoints
# ==========================================
@router.get("/admin/reviews", response_model=List[ReviewOut])
def get_all_reviews_for_admin(
    status_filter: Optional[str] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(Review)
    if status_filter:
        query = query.filter(Review.status == status_filter)
    reviews = query.order_by(desc(Review.created_at)).limit(limit).all()
    results = []
    for r in reviews:
        results.append({
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else f"Garment #{r.product_id}",
            "user_id": r.user_id,
            "user_name": r.user.full_name if r.user else "Client",
            "rating": r.rating,
            "title": r.title,
            "comment": r.comment,
            "status": r.status,
            "is_verified_purchase": r.is_verified_purchase,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return results

@router.put("/admin/reviews/{review_id}/status", response_model=ReviewOut)
def update_review_status(
    review_id: int,
    status_in: ReviewStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    rev = db.query(Review).filter(Review.id == review_id).first()
    if not rev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    new_st = status_in.status.lower()
    if new_st not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid review status. Must be pending, approved, or rejected.")

    rev.status = new_st
    db.commit()
    db.refresh(rev)

    return {
        "id": rev.id,
        "product_id": rev.product_id,
        "product_name": rev.product.name if rev.product else f"Garment #{rev.product_id}",
        "user_id": rev.user_id,
        "user_name": rev.user.full_name if rev.user else "Client",
        "rating": rev.rating,
        "title": rev.title,
        "comment": rev.comment,
        "status": rev.status,
        "is_verified_purchase": rev.is_verified_purchase,
        "created_at": rev.created_at,
        "updated_at": rev.updated_at
    }

@router.delete("/admin/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    rev = db.query(Review).filter(Review.id == review_id).first()
    if not rev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    db.delete(rev)
    db.commit()
    return None
