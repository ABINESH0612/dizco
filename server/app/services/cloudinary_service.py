import os
import uuid
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class CloudinaryService:
    def __init__(self):
        self._is_configured = bool(
            settings.CLOUDINARY_CLOUD_NAME 
            and settings.CLOUDINARY_API_KEY 
            and settings.CLOUDINARY_API_SECRET
        )
        if self._is_configured:
            try:
                import cloudinary
                cloudinary.config(
                    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                    api_key=settings.CLOUDINARY_API_KEY,
                    api_secret=settings.CLOUDINARY_API_SECRET,
                    secure=True
                )
                logger.info(
                    "Cloudinary configured successfully for cloud: %s", 
                    settings.CLOUDINARY_CLOUD_NAME
                )
            except Exception as e:
                logger.error("Failed to initialize Cloudinary: %s", str(e))
                self._is_configured = False
        else:
            logger.info("Cloudinary not configured; image storage will use local disk fallback.")

    @property
    def is_configured(self) -> bool:
        return self._is_configured

    def upload_image(
        self, 
        file_bytes: bytes, 
        filename: str, 
        folder: str = "dizco/products"
    ) -> Dict[str, Any]:
        """
        Uploads image to Cloudinary if credentials are configured.
        Uses automatic quality and format optimization.
        Falls back gracefully to local disk storage (/uploads) with logging.
        Returns a dict with 'image_url', 'public_id', and 'storage'.
        """
        if self._is_configured:
            try:
                import cloudinary.uploader
                # Sanitize filename base for public_id
                base_name = os.path.splitext(filename or "image")[0]
                clean_name = "".join(c for c in base_name if c.isalnum() or c in ("-", "_"))[:30]
                unique_public_id = f"{uuid.uuid4().hex[:8]}_{clean_name}" if clean_name else uuid.uuid4().hex[:12]

                # Upload to Cloudinary with automatic optimization
                result = cloudinary.uploader.upload(
                    file_bytes,
                    folder=folder,
                    public_id=unique_public_id,
                    resource_type="image",
                    transformation=[
                        {"quality": "auto", "fetch_format": "auto"}
                    ]
                )
                secure_url = result.get("secure_url", result.get("url"))
                public_id = result.get("public_id")
                return {
                    "image_url": secure_url,
                    "public_id": public_id,
                    "storage": "cloudinary"
                }
            except Exception as exc:
                logger.warning(
                    "Cloudinary upload failed (%s). Falling back to local storage.", 
                    str(exc)
                )

        # Local storage fallback
        ext = os.path.splitext(filename or ".jpg")[1].lower()
        if not ext:
            ext = ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        local_path = os.path.join(settings.UPLOAD_DIR, unique_name)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        
        return {
            "image_url": f"/uploads/{unique_name}",
            "public_id": None,
            "storage": "local"
        }

    def delete_image(self, public_id: Optional[str]) -> bool:
        """
        Deletes asset from Cloudinary by public_id if configured.
        Catches all exceptions to ensure safe, fail-silent behavior.
        """
        if not public_id or not self._is_configured:
            return False
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.destroy(public_id)
            logger.info("Cloudinary asset '%s' deleted, result: %s", public_id, result)
            return True
        except Exception as e:
            logger.error("Failed to delete Cloudinary asset '%s': %s", public_id, str(e))
            return False

    def replace_image(
        self,
        file_bytes: bytes,
        filename: str,
        old_public_id: Optional[str] = None,
        folder: str = "dizco/products"
    ) -> Dict[str, Any]:
        """
        Replaces an existing image by uploading the new image first.
        If upload succeeds and an old public_id exists, safely destroys the old asset.
        """
        result = self.upload_image(file_bytes, filename, folder=folder)
        if old_public_id:
            self.delete_image(old_public_id)
        return result

cloudinary_service = CloudinaryService()
