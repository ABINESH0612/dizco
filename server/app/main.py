import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base, ensure_schema_updates
from app.api import auth, categories, products, orders, admin, cms, coupons, reviews
from app.services.cloudinary_service import cloudinary_service
from app.models import models as _models

logger = logging.getLogger(__name__)

# Ensure database tables exist and columns migrated
Base.metadata.create_all(bind=engine)
ensure_schema_updates()

logger.info("DIZCO API Startup — Cloudinary configured: %s", cloudinary_service.is_configured)

app = FastAPI(
    title="DIZCO Fashion E-Commerce API",
    description="REST API for DIZCO Luxury Fashion Platform — Customer Storefront & Operational Admin",
    version="1.0.0"
)

# Configure CORS with explicit, environment-driven allowed origins
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.FRONTEND_BASE_URL and settings.FRONTEND_BASE_URL not in allowed_origins:
    allowed_origins.append(settings.FRONTEND_BASE_URL.rstrip("/"))

if settings.ALLOWED_ORIGINS:
    for extra_origin in settings.ALLOWED_ORIGINS.split(","):
        cleaned = extra_origin.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Mount uploaded media directory
if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(cms.router, prefix="/api")
app.include_router(coupons.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")

def _check_db_connectivity() -> bool:
    """Safe check for database connectivity without leaking internal state."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

@app.get("/health")
@app.get("/api/health")
def health_check():
    db_ok = _check_db_connectivity()
    return {
        "status": "online" if db_ok else "degraded",
        "database": "connected" if db_ok else "unavailable",
        "platform": "DIZCO Fashion Commerce",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
