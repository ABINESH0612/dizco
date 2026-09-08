"""
DIZCO Cloudinary Image Service & Management — Unit Tests
---------------------------------------------------------
All 12 tests use unittest.mock to mock Cloudinary SDK calls.
Zero real network requests or external uploads are made.

Run with:
    .\\venv312\\Scripts\\python.exe -m pytest test_cloudinary_service.py -v
"""

import io
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import engine

client = TestClient(app)

class TestCloudinaryServiceUnit(unittest.TestCase):
    """Unit tests for CloudinaryService and API endpoints."""

    @classmethod
    def tearDownClass(cls):
        engine.dispose()

    def _configured_settings(self):
        m = MagicMock()
        m.CLOUDINARY_CLOUD_NAME = "dizco-cloud"
        m.CLOUDINARY_API_KEY = "1234567890"
        m.CLOUDINARY_API_SECRET = "super_secret_api_key"
        m.UPLOAD_DIR = "uploads"
        return m

    def _unconfigured_settings(self):
        m = MagicMock()
        m.CLOUDINARY_CLOUD_NAME = ""
        m.CLOUDINARY_API_KEY = ""
        m.CLOUDINARY_API_SECRET = ""
        m.UPLOAD_DIR = "uploads"
        return m

    def _get_admin_token(self):
        res = client.post("/api/auth/admin/login", json={
            "email": "admin@dizco.com",
            "password": "Admin@123456"
        })
        self.assertEqual(res.status_code, 200)
        return res.json()["access_token"]

    def _get_customer_token(self):
        res = client.post("/api/auth/login", json={
            "email": "customer@dizco.com",
            "password": "Customer@123456"
        })
        self.assertEqual(res.status_code, 200)
        return res.json()["access_token"]

    # 1. Missing credentials handled safely
    def test_missing_credentials_handled_safely(self):
        from app.services.cloudinary_service import CloudinaryService
        with patch("app.services.cloudinary_service.settings", self._unconfigured_settings()):
            svc = CloudinaryService()
            self.assertFalse(svc.is_configured)

    # 2. Cloudinary initialization
    def test_cloudinary_initialization_with_credentials(self):
        from app.services.cloudinary_service import CloudinaryService
        with patch("app.services.cloudinary_service.settings", self._configured_settings()), \
             patch("cloudinary.config") as mock_config:
            svc = CloudinaryService()
            self.assertTrue(svc.is_configured)
            mock_config.assert_called_once_with(
                cloud_name="dizco-cloud",
                api_key="1234567890",
                api_secret="super_secret_api_key",
                secure=True
            )

    # 3. Successful upload
    def test_successful_upload_calls_cloudinary_uploader(self):
        from app.services.cloudinary_service import CloudinaryService
        mock_res = {
            "secure_url": "https://res.cloudinary.com/dizco-cloud/image/upload/v1/dizco/products/item1.jpg",
            "public_id": "dizco/products/item1"
        }
        with patch("app.services.cloudinary_service.settings", self._configured_settings()), \
             patch("cloudinary.uploader.upload", return_value=mock_res) as mock_upload:
            svc = CloudinaryService()
            result = svc.upload_image(b"fake_jpeg_bytes", "tee.jpg", folder="dizco/products/1")
            self.assertEqual(result["storage"], "cloudinary")
            mock_upload.assert_called_once()
            args, kwargs = mock_upload.call_args
            self.assertEqual(args[0], b"fake_jpeg_bytes")
            self.assertEqual(kwargs.get("folder"), "dizco/products/1")
            self.assertEqual(kwargs.get("resource_type"), "image")

    # 4. Upload returns URL
    def test_upload_returns_secure_url(self):
        from app.services.cloudinary_service import CloudinaryService
        expected_url = "https://res.cloudinary.com/dizco/image/upload/v12345/garment.webp"
        mock_res = {
            "secure_url": expected_url,
            "public_id": "garment_pub_id"
        }
        with patch("app.services.cloudinary_service.settings", self._configured_settings()), \
             patch("cloudinary.uploader.upload", return_value=mock_res):
            svc = CloudinaryService()
            result = svc.upload_image(b"bytes", "garment.webp")
            self.assertEqual(result["image_url"], expected_url)

    # 5. Upload returns public_id
    def test_upload_returns_public_id(self):
        from app.services.cloudinary_service import CloudinaryService
        mock_res = {
            "secure_url": "https://res.cloudinary.com/dizco/img.png",
            "public_id": "dizco/products/unique_pub_123"
        }
        with patch("app.services.cloudinary_service.settings", self._configured_settings()), \
             patch("cloudinary.uploader.upload", return_value=mock_res):
            svc = CloudinaryService()
            result = svc.upload_image(b"bytes", "item.png")
            self.assertEqual(result["public_id"], "dizco/products/unique_pub_123")

    # 6. Invalid file type rejected
    def test_invalid_file_type_rejected(self):
        admin_token = self._get_admin_token()
        prods = client.get("/api/products").json()["items"]
        prod_id = prods[0]["id"]

        invalid_file = ("script.txt", io.BytesIO(b"malicious script"), "text/plain")
        res = client.post(
            f"/api/products/{prod_id}/images",
            files={"file": invalid_file},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid image format", res.json()["detail"])

    # 7. Oversized file rejected (> 5MB)
    def test_oversized_file_rejected(self):
        admin_token = self._get_admin_token()
        prods = client.get("/api/products").json()["items"]
        prod_id = prods[0]["id"]

        oversized_content = b"x" * (5 * 1024 * 1024 + 1024) # 5MB + 1KB
        file_tuple = ("large.jpg", io.BytesIO(oversized_content), "image/jpeg")
        res = client.post(
            f"/api/products/{prod_id}/images",
            files={"file": file_tuple},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("exceeds maximum limit", res.json()["detail"])

    # 8. Delete calls Cloudinary destroy
    def test_delete_calls_cloudinary_destroy(self):
        from app.services.cloudinary_service import CloudinaryService
        with patch("app.services.cloudinary_service.settings", self._configured_settings()), \
             patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as mock_destroy:
            svc = CloudinaryService()
            success = svc.delete_image("dizco/products/asset_456")
            self.assertTrue(success)
            mock_destroy.assert_called_once_with("dizco/products/asset_456")

    # 9. Failed Cloudinary operation handled safely
    def test_failed_cloudinary_operation_handled_safely(self):
        from app.services.cloudinary_service import CloudinaryService
        with patch("app.services.cloudinary_service.settings", self._configured_settings()), \
             patch("cloudinary.uploader.destroy", side_effect=Exception("Cloudinary timeout")):
            svc = CloudinaryService()
            # Should catch exception and return False without raising
            success = svc.delete_image("dizco/products/unreachable_asset")
            self.assertFalse(success)

    # 10. Non-admin cannot upload
    def test_non_admin_cannot_upload(self):
        prods = client.get("/api/products").json()["items"]
        prod_id = prods[0]["id"]
        valid_img = ("tee.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"fakejpg"), "image/jpeg")

        # 10a. Unauthenticated request
        res1 = client.post(f"/api/products/{prod_id}/images", files={"file": valid_img})
        self.assertIn(res1.status_code, (401, 403))

        # 10b. Customer user
        cust_token = self._get_customer_token()
        valid_img_2 = ("tee.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"fakejpg"), "image/jpeg")
        res2 = client.post(
            f"/api/products/{prod_id}/images",
            files={"file": valid_img_2},
            headers={"Authorization": f"Bearer {cust_token}"}
        )
        self.assertEqual(res2.status_code, 403)

    # 11. Non-admin cannot delete
    def test_non_admin_cannot_delete(self):
        # 11a. Unauthenticated request
        res1 = client.delete("/api/products/images/999")
        self.assertIn(res1.status_code, (401, 403))

        # 11b. Customer user
        cust_token = self._get_customer_token()
        res2 = client.delete("/api/products/images/999", headers={"Authorization": f"Bearer {cust_token}"})
        self.assertEqual(res2.status_code, 403)

    # 12. Existing URL/local images continue working / fallback to local storage
    def test_fallback_to_local_storage_when_unconfigured(self):
        from app.services.cloudinary_service import CloudinaryService
        with patch("app.services.cloudinary_service.settings", self._unconfigured_settings()), \
             patch("builtins.open", unittest.mock.mock_open()):
            svc = CloudinaryService()
            result = svc.upload_image(b"local_image_bytes", "sample.png")
            self.assertEqual(result["storage"], "local")
            self.assertTrue(result["image_url"].startswith("/uploads/"))
            self.assertIsNone(result["public_id"])


if __name__ == "__main__":
    unittest.main()
