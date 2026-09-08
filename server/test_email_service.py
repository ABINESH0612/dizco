"""
DIZCO Email Service — Unit Tests
----------------------------------
All 10 tests use unittest.mock to patch smtplib.SMTP.
No real SMTP connection is made. No real emails are sent.

Run with:
    .\venv312\Scripts\python.exe -m pytest test_email_service.py -v
"""

import logging
import unittest
from unittest.mock import MagicMock, patch, call


class TestEmailServiceInit(unittest.TestCase):
    """1. EmailService instantiates without crash regardless of config."""

    def test_instantiation_does_not_raise(self):
        from app.services.email_service import EmailService
        svc = EmailService()
        self.assertIsNotNone(svc)


class TestMissingSmtpConfig(unittest.TestCase):
    """2. Missing SMTP configuration skips send safely (returns False, no crash)."""

    def test_send_skipped_when_no_host(self):
        from app.services.email_service import EmailService
        svc = EmailService()

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.SMTP_HOST = ""
            mock_settings.SMTP_USERNAME = ""
            mock_settings.SMTP_FROM_NAME = "DIZCO"
            mock_settings.SMTP_FROM_EMAIL = "orders@dizco.com"
            mock_settings.SMTP_USE_TLS = True
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_PASSWORD = "secret"
            mock_settings.FRONTEND_BASE_URL = "http://localhost:5173"

            result = svc.send_email("test@example.com", "Test Subject", "<p>Hello</p>")

        self.assertFalse(result)

    def test_welcome_email_skipped_when_unconfigured(self):
        from app.services.email_service import EmailService
        svc = EmailService()

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.SMTP_HOST = ""
            mock_settings.SMTP_USERNAME = ""
            mock_settings.SMTP_FROM_NAME = "DIZCO"
            mock_settings.SMTP_FROM_EMAIL = "noreply@dizco.com"
            mock_settings.SMTP_USE_TLS = True
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_PASSWORD = ""
            mock_settings.FRONTEND_BASE_URL = "http://localhost:5173"

            result = svc.send_welcome_email("customer@example.com", "Alice")

        self.assertFalse(result)


class TestWelcomeEmail(unittest.TestCase):
    """Tests 3, 5, 9 — welcome email subject, HTML body, customer name."""

    def _make_mock_smtp(self):
        mock_smtp_instance = MagicMock()
        mock_smtp_instance.__enter__ = MagicMock(return_value=mock_smtp_instance)
        mock_smtp_instance.__exit__ = MagicMock(return_value=False)
        return mock_smtp_instance

    def _configured_settings(self):
        m = MagicMock()
        m.SMTP_HOST = "smtp.example.com"
        m.SMTP_PORT = 587
        m.SMTP_USERNAME = "user@example.com"
        m.SMTP_PASSWORD = "S3cret!"
        m.SMTP_FROM_EMAIL = "orders@dizco.com"
        m.SMTP_FROM_NAME = "DIZCO"
        m.SMTP_USE_TLS = True
        m.FRONTEND_BASE_URL = "http://localhost:5173"
        return m

    def test_welcome_email_subject(self):
        """3. Welcome email produces correct subject."""
        from app.services.email_service import EmailService
        svc = EmailService()
        sent_messages = []

        mock_smtp = self._make_mock_smtp()
        mock_smtp.send_message.side_effect = lambda msg: sent_messages.append(msg)

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", return_value=mock_smtp):
            svc.send_welcome_email("alice@example.com", "Alice")

        self.assertEqual(len(sent_messages), 1)
        self.assertEqual(sent_messages[0]["Subject"], "Welcome to DIZCO")

    def test_welcome_email_html_body_generated(self):
        """4. HTML body is generated (not empty)."""
        from app.services.email_service import EmailService
        svc = EmailService()
        sent_messages = []

        mock_smtp = self._make_mock_smtp()
        mock_smtp.send_message.side_effect = lambda msg: sent_messages.append(msg)

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", return_value=mock_smtp):
            svc.send_welcome_email("alice@example.com", "Alice")

        self.assertEqual(len(sent_messages), 1)
        # Email body should be multipart and contain DIZCO branding
        full_str = sent_messages[0].as_string()
        self.assertIn("DIZCO", full_str)
        self.assertIn("alice@example.com", full_str)

    def test_welcome_email_plain_text_fallback(self):
        """5. Plain-text fallback is present alongside HTML."""
        from app.services.email_service import EmailService
        svc = EmailService()
        sent_messages = []

        mock_smtp = self._make_mock_smtp()
        mock_smtp.send_message.side_effect = lambda msg: sent_messages.append(msg)

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", return_value=mock_smtp):
            svc.send_welcome_email("alice@example.com", "Alice")

        full_str = sent_messages[0].as_string()
        # Should have both text/plain and text/html parts
        self.assertIn("text/plain", full_str)
        self.assertIn("text/html", full_str)

    def test_welcome_email_contains_customer_name(self):
        """9. Welcome email contains customer name."""
        from app.services.email_service import EmailService
        svc = EmailService()
        sent_messages = []

        mock_smtp = self._make_mock_smtp()
        mock_smtp.send_message.side_effect = lambda msg: sent_messages.append(msg)

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", return_value=mock_smtp):
            svc.send_welcome_email("bob@example.com", "Bob Sharma")

        full_str = sent_messages[0].as_string()
        self.assertIn("Bob Sharma", full_str)


class TestSmtpFailureHandling(unittest.TestCase):
    """6 & 7 — SMTP failure is handled gracefully; password not exposed in logs."""

    def _configured_settings(self):
        m = MagicMock()
        m.SMTP_HOST = "smtp.example.com"
        m.SMTP_PORT = 587
        m.SMTP_USERNAME = "user@example.com"
        m.SMTP_PASSWORD = "SuperSecretPassword123"
        m.SMTP_FROM_EMAIL = "orders@dizco.com"
        m.SMTP_FROM_NAME = "DIZCO"
        m.SMTP_USE_TLS = True
        m.FRONTEND_BASE_URL = "http://localhost:5173"
        return m

    def test_smtp_failure_does_not_raise(self):
        """6. SMTP failure is handled without raising an exception."""
        import smtplib
        from app.services.email_service import EmailService
        svc = EmailService()

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, "Service unavailable")):
            # Must NOT raise
            result = svc.send_email("someone@example.com", "Test", "<p>Hi</p>")

        self.assertFalse(result)

    def test_smtp_auth_failure_does_not_expose_password(self):
        """7. SMTP authentication failure — password is NOT present in any log output."""
        import smtplib
        from app.services.email_service import EmailService
        svc = EmailService()

        log_records = []

        class CapturingHandler(logging.Handler):
            def emit(self, record):
                log_records.append(record.getMessage())

        handler = CapturingHandler()
        logger = logging.getLogger("app.services.email_service")
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

        try:
            with patch("app.core.config.settings", self._configured_settings()), \
                 patch("smtplib.SMTP") as mock_smtp_cls:
                instance = MagicMock()
                instance.__enter__ = MagicMock(return_value=instance)
                instance.__exit__ = MagicMock(return_value=False)
                instance.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Auth failed")
                mock_smtp_cls.return_value = instance

                svc.send_email("target@example.com", "Subj", "<p>Body</p>")
        finally:
            logger.removeHandler(handler)

        secret = "SuperSecretPassword123"
        for record_msg in log_records:
            self.assertNotIn(secret, record_msg, f"Password found in log: {record_msg!r}")


class TestPasswordResetEmail(unittest.TestCase):
    """8. Password reset email contains the reset URL."""

    def _configured_settings(self):
        m = MagicMock()
        m.SMTP_HOST = "smtp.example.com"
        m.SMTP_PORT = 587
        m.SMTP_USERNAME = "user@example.com"
        m.SMTP_PASSWORD = "S3cret!"
        m.SMTP_FROM_EMAIL = "orders@dizco.com"
        m.SMTP_FROM_NAME = "DIZCO"
        m.SMTP_USE_TLS = True
        m.FRONTEND_BASE_URL = "http://localhost:5173"
        return m

    def test_reset_email_contains_reset_url(self):
        """8. Password reset email contains the reset URL with token."""
        from app.services.email_service import EmailService
        svc = EmailService()
        sent_messages = []

        mock_smtp = MagicMock()
        mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
        mock_smtp.__exit__ = MagicMock(return_value=False)
        mock_smtp.send_message.side_effect = lambda msg: sent_messages.append(msg)

        test_token = "eyJhbGciOiJIUzI1NiJ9.test_token_payload"

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", return_value=mock_smtp):
            svc.send_password_reset_email("user@example.com", "Charlie", test_token)

        self.assertEqual(len(sent_messages), 1)
        msg = sent_messages[0]
        expected_url = f"http://localhost:5173/reset-password?token={test_token}"
        # Inspect decoded parts to avoid quoted-printable line-folding false negatives
        part_contents = [p.get_content() for p in msg.iter_parts()] if msg.is_multipart() else [msg.get_content()]
        self.assertTrue(any(expected_url in content for content in part_contents))


class TestOrderEmail(unittest.TestCase):
    """10. Order confirmation email contains order reference and total."""

    def _configured_settings(self):
        m = MagicMock()
        m.SMTP_HOST = "smtp.example.com"
        m.SMTP_PORT = 587
        m.SMTP_USERNAME = "user@example.com"
        m.SMTP_PASSWORD = "S3cret!"
        m.SMTP_FROM_EMAIL = "orders@dizco.com"
        m.SMTP_FROM_NAME = "DIZCO"
        m.SMTP_USE_TLS = True
        m.FRONTEND_BASE_URL = "http://localhost:5173"
        return m

    def test_order_email_contains_reference_and_total(self):
        """10. Order email contains order reference and total."""
        from app.services.email_service import EmailService
        svc = EmailService()
        sent_messages = []

        mock_smtp = MagicMock()
        mock_smtp.__enter__ = MagicMock(return_value=mock_smtp)
        mock_smtp.__exit__ = MagicMock(return_value=False)
        mock_smtp.send_message.side_effect = lambda msg: sent_messages.append(msg)

        order_dict = {
            "order_number": "DIZ-20260907-ABCDEF",
            "subtotal": 3998.0,
            "discount_amount": 0.0,
            "shipping": 0.0,
            "total": 3998.0,
            "payment_status": "paid",
            "shipping_address": "100 MG Road, Bengaluru, Karnataka 560001",
            "items": [
                {"product_name": "Monolith Tee", "color": "Black", "size": "M", "price": 1999.0, "quantity": 2}
            ],
        }

        with patch("app.core.config.settings", self._configured_settings()), \
             patch("smtplib.SMTP", return_value=mock_smtp):
            svc.send_order_confirmation_email("customer@example.com", "Dana", order_dict)

        self.assertEqual(len(sent_messages), 1)
        full_str = sent_messages[0].as_string()
        self.assertIn("DIZ-20260907-ABCDEF", full_str)
        self.assertIn("3,998.00", full_str)
        self.assertIn("Monolith Tee", full_str)


if __name__ == "__main__":
    unittest.main()
