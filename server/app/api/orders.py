import json
import uuid
import hmac
import hashlib
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Order, OrderItem, Product, ProductVariant, User, Address, Coupon, CouponUsage
from app.schemas.schemas import (
    OrderCreate, OrderOut, RazorpayOrderCreate, RazorpayOrderOut, RazorpayVerifyIn
)
from app.api.auth import get_current_user
from app.api.coupons import validate_and_compute_discount
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])

def _process_successful_payment(order: Order, payment_id: str, db: Session):
    """
    Idempotent settlement helper:
    Transitions order to paid, decrements variant and product stock, records coupon usage,
    and dispatches confirmation + tax invoice emails.
    """
    if order.payment_status == "paid":
        # Already processed idempotently
        return

    order.payment_status = "paid"
    order.status = "processing"
    order.razorpay_payment_id = payment_id

    # 1. Decrement inventory
    for item in order.items:
        # Decrement variant stock if specified
        if item.variant_id:
            variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
            if variant:
                variant.stock_quantity = max(0, variant.stock_quantity - item.quantity)
        
        # Decrement main product stock
        if item.product_id:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                prod.stock_quantity = max(0, prod.stock_quantity - item.quantity)

    # 2. Record coupon usage if applicable
    if order.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == order.coupon_code).first()
        if coupon:
            coupon.used_count += 1
            existing_usage = db.query(CouponUsage).filter(
                CouponUsage.order_id == order.id
            ).first()
            if not existing_usage:
                usage = CouponUsage(
                    coupon_id=coupon.id,
                    user_id=order.user_id,
                    order_id=order.id,
                    discount_amount=order.discount_amount
                )
                db.add(usage)

    db.commit()
    db.refresh(order)

    # 3. Trigger Transactional Emails asynchronously/safely
    try:
        user = db.query(User).filter(User.id == order.user_id).first()
        if user:
            order_dict = {
                "order_number": order.order_number,
                "subtotal": float(order.subtotal),
                "discount_amount": float(order.discount_amount),
                "shipping": float(order.shipping),
                "total": float(order.total),
                "items": [
                    {
                        "product_name": it.product_name,
                        "color": it.color,
                        "size": it.size,
                        "price": float(it.price),
                        "quantity": it.quantity
                    } for it in order.items
                ]
            }
            email_service.send_order_confirmation_email(user.email, user.full_name, order_dict)
            email_service.send_invoice_email(user.email, user.full_name, order_dict)
    except Exception as em_err:
        logger.error("Failed to send post-payment transactional emails: %s", str(em_err))

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not order_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    subtotal = 0.0
    items_to_create = []

    # 1. Server-side validation of products, variants, and stock
    for item_data in order_in.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product or not product.is_active or not product.is_published:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with ID {item_data.product_id} is unavailable."
            )

        variant = None
        color_val = item_data.color
        size_val = item_data.size

        if item_data.variant_id:
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == item_data.variant_id,
                ProductVariant.product_id == product.id,
                ProductVariant.is_active == True
            ).first()
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected variant for '{product.name}' is unavailable."
                )
            if variant.stock_quantity < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name} ({variant.color} / {variant.size})'. Available: {variant.stock_quantity}"
                )
            color_val = variant.color
            size_val = variant.size
            unit_price = float(variant.price if variant.price is not None else (product.sale_price if product.sale_price is not None else product.price))
        else:
            if product.stock_quantity < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}"
                )
            unit_price = float(product.sale_price if product.sale_price is not None else product.price)

        subtotal += unit_price * item_data.quantity

        primary_img = next((img.image_url for img in product.images if img.is_primary), None)
        if not primary_img and product.images:
            primary_img = product.images[0].image_url

        items_to_create.append({
            "product_id": product.id,
            "variant_id": variant.id if variant else None,
            "product_name": product.name,
            "color": color_val,
            "size": size_val,
            "price": unit_price,
            "quantity": item_data.quantity,
            "image_url": primary_img
        })

    # 2. Coupon Validation & Authoritative Discount Calculation
    discount_amount = 0.0
    applied_coupon_code = None
    if order_in.coupon_code:
        clean_code = order_in.coupon_code.strip().upper()
        coupon = db.query(Coupon).filter(Coupon.code == clean_code).first()
        if coupon:
            is_valid, discount, _ = validate_and_compute_discount(coupon, subtotal, current_user.id, db)
            if is_valid:
                discount_amount = discount
                applied_coupon_code = coupon.code

    discounted_subtotal = max(0.0, subtotal - discount_amount)

    # 3. Calculate shipping (free threshold: INR 2999)
    shipping = 0.0 if discounted_subtotal >= 2999.0 else 150.0
    total = round(discounted_subtotal + shipping, 2)

    # Save address to database
    addr = order_in.address
    addr_json = json.dumps(addr.model_dump())

    # Generate order reference
    order_num = f"DIZ-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    order = Order(
        order_number=order_num,
        user_id=current_user.id,
        status="pending",
        subtotal=subtotal,
        discount_amount=discount_amount,
        coupon_code=applied_coupon_code,
        shipping=shipping,
        total=total,
        payment_method="razorpay",
        payment_status="pending",
        shipping_address_json=addr_json
    )
    db.add(order)
    db.flush()

    for it in items_to_create:
        order_item = OrderItem(
            order_id=order.id,
            product_id=it["product_id"],
            variant_id=it["variant_id"],
            product_name=it["product_name"],
            color=it["color"],
            size=it["size"],
            price=it["price"],
            quantity=it["quantity"],
            image_url=it["image_url"]
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)
    return order

@router.post("/razorpay/create", response_model=RazorpayOrderOut)
def create_razorpay_order(
    req: RazorpayOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == req.order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    amount_in_paise = int(round(float(order.total) * 100))
    rzp_order_id = None

    # Try live Razorpay SDK order creation if configured with live keys
    if settings.RAZORPAY_KEY_ID and not settings.RAZORPAY_KEY_ID.startswith("rzp_test_mock"):
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            rzp_order = client.order.create({
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": order.order_number,
                "payment_capture": 1
            })
            rzp_order_id = rzp_order.get("id")
        except Exception as exc:
            logger.info("Razorpay SDK returned fallback in test environment: %s", str(exc))

    if not rzp_order_id:
        rzp_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"

    order.razorpay_order_id = rzp_order_id
    db.commit()

    return {
        "razorpay_order_id": rzp_order_id,
        "amount": amount_in_paise,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_number": order.order_number
    }

@router.post("/razorpay/verify")
def verify_razorpay_payment(
    req: RazorpayVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == req.order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # If already verified, return idempotent success
    if order.payment_status == "paid":
        return {"message": "Payment already verified", "order_number": order.order_number}

    is_verified = False

    # In development / testing, allow sandbox bypass for mock orders or test keys
    if settings.ENVIRONMENT != "production" and (
        req.razorpay_order_id.startswith("order_mock_") or settings.RAZORPAY_KEY_ID.startswith("rzp_test_")
    ):
        is_verified = True
    else:
        # Cryptographic HMAC-SHA256 signature verification
        try:
            message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
            generated_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                message,
                hashlib.sha256
            ).hexdigest()
            is_verified = hmac.compare_digest(generated_signature, req.razorpay_signature)
        except Exception:
            is_verified = False

    if not is_verified:
        order.payment_status = "failed"
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment verification failed: Invalid signature.")

    # Idempotently process settlement, stock decrement, coupon usage, and emails
    _process_successful_payment(order, req.razorpay_payment_id, db)

    return {"message": "Payment verified successfully", "order_number": order.order_number}

@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db)
):
    """
    Idempotent Razorpay Webhook listener with HMAC-SHA256 signature verification.
    """
    raw_body = await request.body()

    # 1. Verify Webhook Signature
    if not x_razorpay_signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-Razorpay-Signature header")

    try:
        expected_sig = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, x_razorpay_signature):
            # Allow test signature only in non-production environments
            if settings.ENVIRONMENT == "production" or x_razorpay_signature != "mock_webhook_signature":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook signature verification failed")

    # 2. Parse event payload
    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed JSON body")

    event = payload.get("event")
    logger.info("Received Razorpay Webhook event: %s", event)

    if event in ["payment.captured", "order.paid"]:
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        rzp_order_id = payment_entity.get("order_id")
        rzp_payment_id = payment_entity.get("id", f"pay_wh_{uuid.uuid4().hex[:8]}")

        if rzp_order_id:
            order = db.query(Order).filter(Order.razorpay_order_id == rzp_order_id).first()
            if order:
                _process_successful_payment(order, rzp_payment_id, db)
                logger.info("Processed webhook settlement for order #%s", order.order_number)

    return {"status": "ok"}

@router.get("/my-orders", response_model=List[OrderOut])
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()

@router.get("/{order_id}", response_model=OrderOut)
def get_order_details(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
