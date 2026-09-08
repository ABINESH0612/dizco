"""initial_schema — full DIZCO database schema

Revision ID: 381bc1e57dce
Revises: 
Create Date: 2026-09-08

This migration creates the complete DIZCO database schema for a fresh
PostgreSQL (or SQLite) deployment.  It is idempotent with respect to
SQLite development databases that already have tables created via
Base.metadata.create_all().

On a clean PostgreSQL instance:
    alembic upgrade head
will run this single migration and produce all tables.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "381bc1e57dce"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all DIZCO tables."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # ── users ────────────────────────────────────────────────────────────────
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("phone", sa.String(length=50), nullable=True),
            sa.Column("role", sa.String(length=50), nullable=False, server_default="customer"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_users_id", "users", ["id"], unique=False)
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── categories ───────────────────────────────────────────────────────────
    if "categories" not in existing_tables:
        op.create_table(
            "categories",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("slug", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("image_url", sa.String(length=500), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("display_order", sa.Integer(), nullable=True, server_default=sa.text("0")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
        op.create_index("ix_categories_id", "categories", ["id"], unique=False)
        op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    # ── products ─────────────────────────────────────────────────────────────
    if "products" not in existing_tables:
        op.create_table(
            "products",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("slug", sa.String(length=280), nullable=False),
            sa.Column("sku", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("sale_price", sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_products_id", "products", ["id"], unique=False)
        op.create_index("ix_products_slug", "products", ["slug"], unique=True)
        op.create_index("ix_products_sku", "products", ["sku"], unique=True)

    # ── product_variants ─────────────────────────────────────────────────────
    if "product_variants" not in existing_tables:
        op.create_table(
            "product_variants",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
            sa.Column("sku", sa.String(length=100), nullable=False),
            sa.Column("color", sa.String(length=100), nullable=False),
            sa.Column("size", sa.String(length=50), nullable=False),
            sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_product_variants_id", "product_variants", ["id"], unique=False)
        op.create_index("ix_product_variants_sku", "product_variants", ["sku"], unique=True)

    # ── product_images ────────────────────────────────────────────────────────
    if "product_images" not in existing_tables:
        op.create_table(
            "product_images",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
            sa.Column("image_url", sa.String(length=500), nullable=False),
            sa.Column("public_id", sa.String(length=255), nullable=True),
            sa.Column("is_primary", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("display_order", sa.Integer(), nullable=True, server_default=sa.text("0")),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_product_images_id", "product_images", ["id"], unique=False)

    # ── addresses ─────────────────────────────────────────────────────────────
    if "addresses" not in existing_tables:
        op.create_table(
            "addresses",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("address_line1", sa.String(length=255), nullable=False),
            sa.Column("address_line2", sa.String(length=255), nullable=True),
            sa.Column("city", sa.String(length=100), nullable=False),
            sa.Column("state", sa.String(length=100), nullable=False),
            sa.Column("zip_code", sa.String(length=20), nullable=False),
            sa.Column("phone", sa.String(length=50), nullable=False),
            sa.Column("is_default", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_addresses_id", "addresses", ["id"], unique=False)

    # ── orders ─────────────────────────────────────────────────────────────────
    if "orders" not in existing_tables:
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("order_number", sa.String(length=50), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("subtotal", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("discount_amount", sa.Numeric(precision=10, scale=2), nullable=False, server_default=sa.text("0.0")),
            sa.Column("coupon_code", sa.String(length=50), nullable=True),
            sa.Column("shipping", sa.Numeric(precision=10, scale=2), nullable=False, server_default=sa.text("0.0")),
            sa.Column("total", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("payment_method", sa.String(length=50), nullable=False, server_default="razorpay"),
            sa.Column("payment_status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("razorpay_order_id", sa.String(length=100), nullable=True),
            sa.Column("razorpay_payment_id", sa.String(length=100), nullable=True),
            sa.Column("shipping_address_json", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_orders_id", "orders", ["id"], unique=False)
        op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)

    # ── order_items ────────────────────────────────────────────────────────────
    if "order_items" not in existing_tables:
        op.create_table(
            "order_items",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
            sa.Column("variant_id", sa.Integer(), sa.ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True),
            sa.Column("product_name", sa.String(length=255), nullable=False),
            sa.Column("color", sa.String(length=100), nullable=True),
            sa.Column("size", sa.String(length=50), nullable=True),
            sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("image_url", sa.String(length=500), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_order_items_id", "order_items", ["id"], unique=False)

    # ── coupons ────────────────────────────────────────────────────────────────
    if "coupons" not in existing_tables:
        op.create_table(
            "coupons",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=50), nullable=False),
            sa.Column("discount_type", sa.String(length=20), nullable=False),
            sa.Column("discount_value", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("min_order_amount", sa.Numeric(precision=10, scale=2), nullable=False, server_default=sa.text("0.0")),
            sa.Column("max_discount", sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column("start_date", sa.DateTime(), nullable=True),
            sa.Column("expiry_date", sa.DateTime(), nullable=True),
            sa.Column("usage_limit", sa.Integer(), nullable=True),
            sa.Column("used_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("per_user_limit", sa.Integer(), nullable=False, server_default=sa.text("1")),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_coupons_id", "coupons", ["id"], unique=False)
        op.create_index("ix_coupons_code", "coupons", ["code"], unique=True)

    # ── coupon_usages ──────────────────────────────────────────────────────────
    if "coupon_usages" not in existing_tables:
        op.create_table(
            "coupon_usages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("coupon_id", sa.Integer(), sa.ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
            sa.Column("discount_amount", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_coupon_usages_id", "coupon_usages", ["id"], unique=False)

    # ── reviews ───────────────────────────────────────────────────────────────
    if "reviews" not in existing_tables:
        op.create_table(
            "reviews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=True),
            sa.Column("comment", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("is_verified_purchase", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_reviews_id", "reviews", ["id"], unique=False)

    # ── content_pages ─────────────────────────────────────────────────────────
    if "content_pages" not in existing_tables:
        op.create_table(
            "content_pages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_content_pages_id", "content_pages", ["id"], unique=False)
        op.create_index("ix_content_pages_slug", "content_pages", ["slug"], unique=True)

    # ── store_settings ────────────────────────────────────────────────────────
    if "store_settings" not in existing_tables:
        op.create_table(
            "store_settings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_store_settings_id", "store_settings", ["id"], unique=False)
        op.create_index("ix_store_settings_key", "store_settings", ["key"], unique=True)


def downgrade() -> None:
    """Drop all DIZCO tables (WARNING: destroys all data)."""
    op.drop_table("store_settings")
    op.drop_table("content_pages")
    op.drop_table("reviews")
    op.drop_table("coupon_usages")
    op.drop_table("coupons")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("addresses")
    op.drop_table("product_images")
    op.drop_table("product_variants")
    op.drop_table("products")
    op.drop_table("categories")
    op.drop_table("users")
