"""
DIZCO Transactional Email Service
----------------------------------
Uses Python stdlib smtplib + email.message.EmailMessage.
No external dependencies required.

Design principles:
- If SMTP is not configured, emails are skipped silently (development safe).
- SMTP credentials are NEVER logged.
- All exceptions are caught and logged at WARNING level without crashing callers.
- HTML templates are loaded from app/templates/emails/ at runtime.
- Plain-text fallback is always generated.
"""

import os
import smtplib
import logging
import textwrap
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)

# Resolve the templates directory relative to this file
_TEMPLATES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "templates", "emails"
)


def _load_template(name: str) -> str:
    """Load a raw template file from app/templates/emails/."""
    path = os.path.join(_TEMPLATES_DIR, name)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read()
    except FileNotFoundError:
        logger.warning("Email template not found: %s", path)
        return ""


def _render_base(subject: str, body: str, frontend_url: str) -> str:
    """Wrap a body fragment inside base.html."""
    base = _load_template("base.html")
    if not base:
        # Minimal fallback if template file is missing
        return f"<html><body>{body}</body></html>"
    return (
        base
        .replace("{{subject}}", subject)
        .replace("{{body}}", body)
        .replace("{{frontend_url}}", frontend_url)
    )


def _html_to_text(html: str) -> str:
    """Very lightweight HTML → plain-text conversion (no external deps)."""
    import re
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.replace("&rsquo;", "'").replace("&mdash;", " - ").replace("&amp;", "&")
    text = text.replace("&copy;", "(c)").replace("&nbsp;", " ")
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(lines).strip()


class EmailService:
    """
    Transactional email service for DIZCO.

    Importing this class and instantiating it is always safe —
    it will NOT crash even if SMTP is completely unconfigured.
    """

    def __init__(self):
        # Settings are imported lazily inside methods so the app can start
        # before env vars are validated.
        pass

    # ------------------------------------------------------------------
    # Low-level send primitive
    # ------------------------------------------------------------------

    def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """
        Send a single email.

        Returns True on success, False on any failure (never raises).
        SMTP credentials are never written to logs.
        """
        from app.core.config import settings

        # Guard: skip silently if SMTP is not configured
        if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
            logger.info(
                "SMTP not configured — skipping email to %s <%s>",
                subject,
                _domain_only(to),
            )
            return False

        if text_body is None:
            text_body = _html_to_text(html_body)

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to
        # Set plain-text body first, then add HTML alternative
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
                smtp.ehlo()
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                    smtp.ehlo()
                # Login — credentials deliberately not included in any log message
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
            logger.info(
                "Email sent — subject=%r recipient_domain=%s",
                subject,
                _domain_only(to),
            )
            return True

        except smtplib.SMTPAuthenticationError:
            logger.warning(
                "SMTP authentication failed for host=%s — check SMTP_USERNAME / SMTP_PASSWORD",
                settings.SMTP_HOST,
            )
        except smtplib.SMTPConnectError:
            logger.warning(
                "SMTP connection failed — host=%s port=%s",
                settings.SMTP_HOST,
                settings.SMTP_PORT,
            )
        except smtplib.SMTPException as exc:
            logger.warning("SMTP error sending email: %s: %s", type(exc).__name__, str(exc))
        except OSError as exc:
            logger.warning("Network error sending email: %s", type(exc).__name__)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Unexpected error sending email: %s", type(exc).__name__)

        return False

    # ------------------------------------------------------------------
    # Public transactional email methods (same signatures as original stub)
    # ------------------------------------------------------------------

    def send_welcome_email(self, email: str, full_name: str) -> bool:
        """Send welcome email after successful customer registration."""
        from app.core.config import settings

        subject = "Welcome to DIZCO"
        joined_date = datetime.now(timezone.utc).strftime("%d %B %Y")

        body_template = _load_template("welcome.html")
        body = (
            body_template
            .replace("{{full_name}}", _esc(full_name))
            .replace("{{email}}", _esc(email))
            .replace("{{joined_date}}", joined_date)
            .replace("{{frontend_url}}", settings.FRONTEND_BASE_URL)
        )

        html = _render_base(subject, body, settings.FRONTEND_BASE_URL)
        return self.send_email(email, subject, html)

    def send_password_reset_email(
        self, email: str, full_name: str, reset_token: str
    ) -> bool:
        """Send password reset link. Token is embedded in URL, never logged."""
        from app.core.config import settings

        subject = "Reset your DIZCO password"
        reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={reset_token}"

        body_template = _load_template("password_reset.html")
        body = (
            body_template
            .replace("{{full_name}}", _esc(full_name))
            .replace("{{email}}", _esc(email))
            .replace("{{reset_url}}", reset_url)
            .replace("{{frontend_url}}", settings.FRONTEND_BASE_URL)
        )

        html = _render_base(subject, body, settings.FRONTEND_BASE_URL)
        return self.send_email(email, subject, html)

    def send_order_confirmation_email(
        self, email: str, full_name: str, order_dict: dict
    ) -> bool:
        """Send order confirmation after payment success."""
        from app.core.config import settings

        order_number = order_dict.get("order_number", "—")
        subject = f"Order Confirmed — {order_number}"
        order_date = order_dict.get(
            "order_date",
            datetime.now(timezone.utc).strftime("%d %B %Y")
        )
        payment_status = order_dict.get("payment_status", "Paid").upper()

        # Build item rows
        items_rows = _build_item_rows_simple(order_dict.get("items", []))
        discount_row = _build_discount_row(order_dict)
        shipping_address = _esc(order_dict.get("shipping_address", ""))

        body_template = _load_template("order_confirmation.html")
        body = (
            body_template
            .replace("{{full_name}}", _esc(full_name))
            .replace("{{order_number}}", _esc(order_number))
            .replace("{{order_date}}", order_date)
            .replace("{{payment_status}}", payment_status)
            .replace("{{items_rows}}", items_rows)
            .replace("{{discount_row}}", discount_row)
            .replace("{{subtotal}}", _inr(order_dict.get("subtotal", 0)))
            .replace("{{shipping}}", _shipping_label(order_dict.get("shipping", 0)))
            .replace("{{total}}", _inr(order_dict.get("total", 0)))
            .replace("{{shipping_address}}", shipping_address)
            .replace("{{orders_url}}", f"{settings.FRONTEND_BASE_URL}/account/orders")
            .replace("{{frontend_url}}", settings.FRONTEND_BASE_URL)
        )

        html = _render_base(subject, body, settings.FRONTEND_BASE_URL)
        return self.send_email(email, subject, html)

    def send_invoice_email(
        self, email: str, full_name: str, order_dict: dict
    ) -> bool:
        """Send tax invoice email after payment success."""
        from app.core.config import settings

        order_number = order_dict.get("order_number", "—")
        subject = f"DIZCO Invoice — {order_number}"
        order_date = order_dict.get(
            "order_date",
            datetime.now(timezone.utc).strftime("%d %B %Y")
        )
        payment_status = order_dict.get("payment_status", "Paid").upper()

        invoice_items_rows = _build_invoice_item_rows(order_dict.get("items", []))
        discount_row = _build_discount_row(order_dict)
        shipping_address = _esc(order_dict.get("shipping_address", ""))

        body_template = _load_template("invoice.html")
        body = (
            body_template
            .replace("{{full_name}}", _esc(full_name))
            .replace("{{email}}", _esc(email))
            .replace("{{order_number}}", _esc(order_number))
            .replace("{{order_date}}", order_date)
            .replace("{{payment_status}}", payment_status)
            .replace("{{invoice_items_rows}}", invoice_items_rows)
            .replace("{{discount_row}}", discount_row)
            .replace("{{subtotal}}", _inr(order_dict.get("subtotal", 0)))
            .replace("{{shipping}}", _shipping_label(order_dict.get("shipping", 0)))
            .replace("{{total}}", _inr(order_dict.get("total", 0)))
            .replace("{{shipping_address}}", shipping_address)
            .replace("{{frontend_url}}", settings.FRONTEND_BASE_URL)
        )

        html = _render_base(subject, body, settings.FRONTEND_BASE_URL)
        return self.send_email(email, subject, html)


# ------------------------------------------------------------------
# Private helpers
# ------------------------------------------------------------------

def _domain_only(email: str) -> str:
    """Return only the domain part of an email address for safe logging."""
    try:
        return "@" + email.split("@", 1)[1]
    except (IndexError, AttributeError):
        return "@unknown"


def _esc(value: str) -> str:
    """Minimal HTML escaping for user-supplied strings."""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _inr(amount) -> str:
    """Format a number as Indian Rupees."""
    try:
        return f"&#8377;{float(amount):,.2f}"
    except (TypeError, ValueError):
        return "&#8377;0.00"


def _shipping_label(amount) -> str:
    try:
        val = float(amount)
    except (TypeError, ValueError):
        val = 0.0
    return "FREE" if val == 0.0 else _inr(val)


def _build_item_rows_simple(items: list) -> str:
    rows = []
    for item in items:
        name = _esc(item.get("product_name", "—"))
        color = item.get("color") or ""
        size = item.get("size") or ""
        variant_label = ""
        if color or size:
            parts = [p for p in [color, size] if p]
            variant_label = f"<br/><span style='font-size:12px;color:#666;'>{_esc(', '.join(parts))}</span>"
        qty = item.get("quantity", 1)
        price = float(item.get("price", 0))
        rows.append(
            f"<tr>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#c0c0c0;'>{name}{variant_label}</td>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#c0c0c0;'>{qty}</td>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#e0e0e0;text-align:right;'>{_inr(price)}</td>"
            f"</tr>"
        )
    return "".join(rows) if rows else "<tr><td colspan='3' style='color:#666;padding:12px 0;'>No items</td></tr>"


def _build_invoice_item_rows(items: list) -> str:
    rows = []
    for item in items:
        name = _esc(item.get("product_name", "—"))
        color = item.get("color") or ""
        size = item.get("size") or ""
        variant_label = ""
        if color or size:
            parts = [p for p in [color, size] if p]
            variant_label = f"<br/><span style='font-size:12px;color:#666;'>{_esc(', '.join(parts))}</span>"
        qty = item.get("quantity", 1)
        price = float(item.get("price", 0))
        amount = price * qty
        rows.append(
            f"<tr>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#c0c0c0;'>{name}{variant_label}</td>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#c0c0c0;'>{qty}</td>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#e0e0e0;text-align:right;'>{_inr(price)}</td>"
            f"<td style='padding:12px 0;border-bottom:1px solid #1a1a1a;color:#e0e0e0;text-align:right;'>{_inr(amount)}</td>"
            f"</tr>"
        )
    return "".join(rows) if rows else "<tr><td colspan='4' style='color:#666;padding:12px 0;'>No items</td></tr>"


def _build_discount_row(order_dict: dict) -> str:
    discount = float(order_dict.get("discount_amount", 0))
    coupon = order_dict.get("coupon_code", "")
    if discount <= 0:
        return ""
    label = f"Discount{' (' + _esc(coupon) + ')' if coupon else ''}"
    return (
        f"<tr>"
        f"<td class='label' style='color:#4caf50;'>{label}</td>"
        f"<td class='amount' style='color:#4caf50;'>-{_inr(discount)}</td>"
        f"</tr>"
    )


# Module-level singleton — same pattern as the original stub
email_service = EmailService()
