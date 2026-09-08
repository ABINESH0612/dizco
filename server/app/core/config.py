import os
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "DIZCO E-Commerce API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower() # "development" | "production" | "testing"
    
    # Secret key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dizco-dev-jwt-secret-not-for-production-use-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dizco.db")
    
    # Razorpay Credentials
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_dizco2026key")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "dizco_test_secret_998877")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "dizco_webhook_secret_12345")
    
    # Cloudinary Credentials
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    
    # SMTP Transactional Email Credentials
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "orders@dizco.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "DIZCO")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    # Frontend base URL — used in transactional email links
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")
    
    # Uploads
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    
    model_config = ConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    @property
    def normalized_database_url(self) -> str:
        """Handle PostgreSQL URL dialect compatibility (postgres:// -> postgresql://)."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

settings = Settings()

# Enforce secure SECRET_KEY in production
if settings.ENVIRONMENT == "production":
    if not settings.SECRET_KEY or settings.SECRET_KEY == "dizco-dev-jwt-secret-not-for-production-use-2026" or len(settings.SECRET_KEY) < 32:
        raise RuntimeError(
            "FATAL CONFIGURATION ERROR: In production mode, a strong SECRET_KEY (minimum 32 characters) "
            "must be provided via the environment variable SECRET_KEY. Startup aborted for security."
        )

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
