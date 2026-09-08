from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ==========================================
# Base Config
# ==========================================
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# User & Auth Schemas
# ==========================================
class UserBase(BaseSchema):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseSchema):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class UserUpdate(BaseSchema):
    full_name: Optional[str] = None
    phone: Optional[str] = None

class PasswordChange(BaseSchema):
    current_password: str
    new_password: str

class ForgotPasswordIn(BaseSchema):
    email: EmailStr

class ResetPasswordIn(BaseSchema):
    token: str
    new_password: str

# ==========================================
# Category Schemas
# ==========================================
class CategoryBase(BaseSchema):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    display_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseSchema):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class CategoryOut(CategoryBase):
    id: int

# ==========================================
# Product Variant & Image Schemas
# ==========================================
class ProductImageBase(BaseSchema):
    image_url: str
    public_id: Optional[str] = None
    is_primary: bool = False
    display_order: int = 0

class ProductImageOut(ProductImageBase):
    id: int
    product_id: int

class ProductVariantBase(BaseSchema):
    sku: str
    color: str
    size: str
    price: Optional[float] = None
    stock_quantity: int = 0
    is_active: bool = True

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantUpdate(BaseSchema):
    sku: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_active: Optional[bool] = None

class ProductVariantOut(ProductVariantBase):
    id: int
    product_id: int

# ==========================================
# Product Schemas
# ==========================================
class ProductBase(BaseSchema):
    name: str
    slug: str
    sku: str
    description: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock_quantity: int = 0
    category_id: Optional[int] = None
    is_active: bool = True
    is_published: bool = True

class ProductCreate(ProductBase):
    images: Optional[List[str]] = []

class ProductUpdate(BaseSchema):
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None

class ProductOut(ProductBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category: Optional[CategoryOut] = None
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []
    average_rating: Optional[float] = None
    review_count: int = 0

class ProductPagination(BaseSchema):
    items: List[ProductOut]
    total: int
    page: int
    limit: int
    pages: int

# ==========================================
# Order Schemas
# ==========================================
class AddressSchema(BaseSchema):
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    phone: str

class OrderItemCreate(BaseSchema):
    product_id: int
    quantity: int = Field(..., ge=1)
    variant_id: Optional[int] = None
    color: Optional[str] = None
    size: Optional[str] = None

class OrderCreate(BaseSchema):
    items: List[OrderItemCreate]
    address: AddressSchema
    coupon_code: Optional[str] = None

class OrderItemOut(BaseSchema):
    id: int
    order_id: int
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    product_name: str
    color: Optional[str] = None
    size: Optional[str] = None
    price: float
    quantity: int
    image_url: Optional[str] = None

class OrderOut(BaseSchema):
    id: int
    order_number: str
    user_id: int
    status: str
    subtotal: float
    discount_amount: float
    coupon_code: Optional[str] = None
    shipping: float
    total: float
    payment_method: str
    payment_status: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    shipping_address_json: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[OrderItemOut] = []

class OrderStatusUpdate(BaseSchema):
    status: str

class RazorpayOrderCreate(BaseSchema):
    order_id: int

class RazorpayOrderOut(BaseSchema):
    razorpay_order_id: str
    amount: int
    currency: str = "INR"
    key_id: Optional[str] = None
    order_number: str

class RazorpayVerifyIn(BaseSchema):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# ==========================================
# Admin Schemas
# ==========================================
class DashboardMetricsOut(BaseSchema):
    total_sales: float
    total_orders: int
    total_customers: int
    total_products: int
    low_stock_count: int
    recent_orders: List[OrderOut] = []

# ==========================================
# CMS & Store Settings Schemas
# ==========================================
class ContentPageOut(BaseSchema):
    id: int
    slug: str
    title: str
    content: str
    updated_at: Optional[datetime] = None

class ContentPageUpdate(BaseSchema):
    title: str
    content: str

class StoreSettingOut(BaseSchema):
    id: int
    key: str
    value: str
    description: Optional[str] = None

class StoreSettingUpdate(BaseSchema):
    value: str

# ==========================================
# Coupon Schemas
# ==========================================
class CouponBase(BaseSchema):
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: float = 0.0
    max_discount: Optional[float] = None
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    per_user_limit: int = 1
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseSchema):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount: Optional[float] = None
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = None
    is_active: Optional[bool] = None

class CouponOut(CouponBase):
    id: int
    used_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class CouponValidateIn(BaseSchema):
    code: str
    subtotal: float

class CouponValidateOut(BaseSchema):
    valid: bool
    code: str
    discount_amount: float
    discount_type: str
    discount_value: float
    final_total: float
    message: str

class CouponUsageOut(BaseSchema):
    id: int
    coupon_id: int
    user_id: int
    order_id: Optional[int] = None
    discount_amount: float
    created_at: Optional[datetime] = None
    user_email: Optional[str] = None

# ==========================================
# Review Schemas
# ==========================================
class ReviewCreate(BaseSchema):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    comment: str

class ReviewUpdate(BaseSchema):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None

class ReviewStatusUpdate(BaseSchema):
    status: str

class ReviewOut(BaseSchema):
    id: int
    product_id: int
    product_name: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    rating: int
    title: Optional[str] = None
    comment: str
    status: str
    is_verified_purchase: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProductReviewsSummaryOut(BaseSchema):
    average_rating: float
    total_reviews: int
    reviews: List[ReviewOut] = []
