from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.models import Coupon, CouponUsage, User
from app.schemas.schemas import (
    CouponCreate, CouponUpdate, CouponOut, CouponValidateIn, CouponValidateOut, CouponUsageOut
)
from app.api.auth import get_current_user, get_current_admin, get_optional_current_user

router = APIRouter(tags=["Coupons & Promotions"])

def validate_and_compute_discount(coupon: Coupon, subtotal: float, user_id: Optional[int], db: Session):
    """Authoritative server-side discount calculation and validation."""
    now = datetime.now(timezone.utc)

    if not coupon.is_active:
        return False, 0.0, "This coupon code is inactive."

    if coupon.start_date and coupon.start_date.tzinfo is None:
        start = coupon.start_date.replace(tzinfo=timezone.utc)
    else:
        start = coupon.start_date

    if coupon.expiry_date and coupon.expiry_date.tzinfo is None:
        expiry = coupon.expiry_date.replace(tzinfo=timezone.utc)
    else:
        expiry = coupon.expiry_date

    if start and now < start:
        return False, 0.0, "This coupon promotion has not started yet."

    if expiry and now > expiry:
        return False, 0.0, "This coupon has expired."

    if subtotal < float(coupon.min_order_amount):
        return False, 0.0, f"Minimum order amount of ₹{coupon.min_order_amount:,.2f} required for this coupon."

    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        return False, 0.0, "This coupon has reached its total redemption limit."

    if user_id is not None:
        user_uses = db.query(CouponUsage).filter(
            CouponUsage.coupon_id == coupon.id,
            CouponUsage.user_id == user_id
        ).count()
        if user_uses >= coupon.per_user_limit:
            return False, 0.0, f"You have already redeemed this coupon the maximum allowed times ({coupon.per_user_limit})."

    # Compute discount amount
    if coupon.discount_type == "percentage":
        computed = (subtotal * float(coupon.discount_value)) / 100.0
        if coupon.max_discount is not None and float(coupon.max_discount) > 0:
            computed = min(computed, float(coupon.max_discount))
    else: # fixed
        computed = float(coupon.discount_value)

    discount_amount = max(0.0, min(subtotal, round(computed, 2)))
    return True, discount_amount, f"Coupon '{coupon.code}' applied successfully!"

# ==========================================
# Storefront / Customer Endpoints
# ==========================================
@router.post("/coupons/validate", response_model=CouponValidateOut)
def validate_coupon(
    req: CouponValidateIn,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    clean_code = req.code.strip().upper()
    coupon = db.query(Coupon).filter(Coupon.code == clean_code).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid coupon code.")

    is_valid, discount, message = validate_and_compute_discount(
        coupon, req.subtotal, current_user.id if current_user else None, db
    )

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    final_total = max(0.0, round(req.subtotal - discount, 2))
    return {
        "valid": True,
        "code": coupon.code,
        "discount_amount": discount,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "final_total": final_total,
        "message": message
    }

# ==========================================
# Admin Management Endpoints
# ==========================================
@router.get("/admin/coupons", response_model=List[CouponOut])
def get_all_coupons(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(Coupon).order_by(desc(Coupon.created_at)).all()

@router.post("/admin/coupons", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
def create_coupon(
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    clean_code = coupon_in.code.strip().upper()
    existing = db.query(Coupon).filter(Coupon.code == clean_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Coupon code '{clean_code}' already exists.")

    coupon = Coupon(
        code=clean_code,
        discount_type=coupon_in.discount_type.lower(),
        discount_value=coupon_in.discount_value,
        min_order_amount=coupon_in.min_order_amount,
        max_discount=coupon_in.max_discount,
        start_date=coupon_in.start_date,
        expiry_date=coupon_in.expiry_date,
        usage_limit=coupon_in.usage_limit,
        per_user_limit=coupon_in.per_user_limit,
        is_active=coupon_in.is_active
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon

@router.put("/admin/coupons/{coupon_id}", response_model=CouponOut)
def update_coupon(
    coupon_id: int,
    coupon_in: CouponUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    update_data = coupon_in.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].strip().upper()

    for k, v in update_data.items():
        setattr(coupon, k, v)

    db.commit()
    db.refresh(coupon)
    return coupon

@router.delete("/admin/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return None

@router.get("/admin/coupons/{coupon_id}/usage", response_model=List[CouponUsageOut])
def get_coupon_usage_history(
    coupon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    usages = db.query(CouponUsage).filter(CouponUsage.coupon_id == coupon_id).order_by(desc(CouponUsage.created_at)).all()
    results = []
    for u in usages:
        results.append({
            "id": u.id,
            "coupon_id": u.coupon_id,
            "user_id": u.user_id,
            "order_id": u.order_id,
            "discount_amount": float(u.discount_amount),
            "created_at": u.created_at,
            "user_email": u.user.email if u.user else None
        })
    return results
