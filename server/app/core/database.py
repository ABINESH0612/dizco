from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Configure SQLite or PostgreSQL engine with production-ready connection management
db_url = settings.normalized_database_url

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # PostgreSQL production pooling settings
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_updates():
    """Ensure newly added columns exist in existing tables for development SQLite / PostgreSQL."""
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check and add columns to orders
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0.0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50)"))
            conn.commit()
        except Exception:
            pass

        # Check and add columns to order_items
        try:
            conn.execute(text("ALTER TABLE order_items ADD COLUMN variant_id INTEGER"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE order_items ADD COLUMN color VARCHAR(100)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE order_items ADD COLUMN size VARCHAR(50)"))
            conn.commit()
        except Exception:
            pass

        # Check and add columns to product_images
        try:
            conn.execute(text("ALTER TABLE product_images ADD COLUMN public_id VARCHAR(255)"))
            conn.commit()
        except Exception:
            pass

