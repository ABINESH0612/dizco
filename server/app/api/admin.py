from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.models import Order, Product, User
from app.schemas.schemas import (
    DashboardMetricsOut, OrderOut, OrderStatusUpdate, ProductOut, UserOut
)
from app.api.auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/dashboard", response_model=DashboardMetricsOut)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    # Total revenue from paid orders
    total_sales = db.query(func.sum(Order.total)).filter(Order.payment_status == "paid").scalar() or 0.0
    total_orders = db.query(Order).count()
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_products = db.query(Product).count()
    low_stock_count = db.query(Product).filter(Product.stock_quantity <= 5).count()

    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(5).all()

    return {
        "total_sales": float(total_sales),
        "total_orders": total_orders,
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "recent_orders": recent_orders
    }

@router.get("/orders", response_model=List[OrderOut])
def get_all_orders(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    admin = Depends(get_current_admin)
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.order_by(desc(Order.created_at)).offset(offset).limit(limit).all()

@router.put("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    order.status = status_in.status.lower()
    db.commit()
    db.refresh(order)
    return order

@router.get("/inventory/alerts", response_model=List[ProductOut])
def get_inventory_alerts(
    threshold: int = 5,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    return db.query(Product).filter(Product.stock_quantity <= threshold).order_by(Product.stock_quantity.asc()).all()

@router.get("/customers", response_model=List[UserOut])
def get_all_customers(
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    return db.query(User).filter(User.role == "customer").order_by(desc(User.created_at)).all()
