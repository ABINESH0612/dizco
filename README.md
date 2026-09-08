# DIZCO — Contemporary Editorial Fashion E-Commerce Platform

DIZCO is a production-grade, full-stack fashion e-commerce application built with FastAPI and React.

---

## Architecture

```
dizco/
├── server/          # FastAPI backend (Python 3.12)
│   ├── app/
│   │   ├── api/         # Route handlers (auth, products, orders, coupons, reviews, admin)
│   │   ├── core/        # Config, database engine, security utilities
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── services/    # Email service, Cloudinary service, seed data
│   │   └── templates/   # Jinja2 HTML email templates
│   ├── alembic/         # Database migration scripts
│   ├── requirements.txt
│   └── test_backend.py  # 47-test integration suite
│
├── client/          # React 19 + Vite 8 frontend
│   ├── src/
│   │   ├── context/     # AuthContext, CartContext, WishlistContext, ToastContext
│   │   ├── components/  # Layout, cart drawer, admin layout
│   │   ├── pages/       # Storefront, auth, admin pages
│   │   └── services/    # Axios API client
│   └── vercel.json      # Vercel deployment config
│
└── render.yaml      # Render.com backend + PostgreSQL deployment config
```

**Tech Stack**

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Axios |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Database | SQLite (dev) / PostgreSQL (production) |
| Auth | JWT (HS256), PBKDF2-HMAC-SHA256 passwords |
| Payments | Razorpay (sandbox + live) |
| Images | Cloudinary (with local `/uploads` fallback) |
| Email | SMTP transactional (Jinja2 HTML templates) |
| Deployment | Vercel (frontend) + Render (backend + PostgreSQL) |

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 18+

### Backend Setup

```bash
cd server

# Create and activate virtual environment
python -m venv venv312
.\venv312\Scripts\activate        # Windows
# source venv312/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create local environment file
copy .env.example .env            # Windows
# cp .env.example .env            # macOS/Linux

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create local environment file
copy .env.example .env.local      # Windows
# cp .env.example .env.local      # macOS/Linux

# Edit .env.local — for local dev, leave VITE_API_URL blank (Vite proxy handles it)

# Start development server
npm run dev
```

The Vite dev server proxies `/api` → `http://127.0.0.1:8000` automatically.

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `ENVIRONMENT` | ✅ | `development` \| `production` \| `testing` |
| `SECRET_KEY` | ✅ | JWT signing key (32+ chars in production) |
| `DATABASE_URL` | ✅ | `sqlite:///./dizco.db` or `postgresql://...` |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Razorpay webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | optional | Cloudinary cloud name (blank = local storage) |
| `CLOUDINARY_API_KEY` | optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | optional | Cloudinary API secret |
| `SMTP_HOST` | optional | SMTP server host (blank = emails skipped) |
| `SMTP_PORT` | optional | SMTP port (default: 587) |
| `SMTP_USERNAME` | optional | SMTP username |
| `SMTP_PASSWORD` | optional | SMTP password / API key |
| `SMTP_FROM_EMAIL` | optional | Sender email address |
| `SMTP_FROM_NAME` | optional | Sender display name |
| `SMTP_USE_TLS` | optional | `true` or `false` (default: true) |
| `FRONTEND_BASE_URL` | optional | Frontend URL for email links |
| `ALLOWED_ORIGINS` | optional | Comma-separated extra CORS origins |

> **Security**: In `production` mode, the server will **refuse to start** if `SECRET_KEY` is weak or uses the default development value.

### Frontend (`client/.env.local` or Vercel environment)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | optional | Backend API base URL (e.g. `https://your-backend.onrender.com/api`) |

Leave `VITE_API_URL` blank in development — Vite's proxy handles it automatically.

---

## PostgreSQL Setup

### On Render (Managed)

Render automatically provisions PostgreSQL and injects `DATABASE_URL` when you use `render.yaml`.

### Self-hosted / Manual

```bash
# Create the production database
psql -U postgres -c "CREATE DATABASE dizco_prod;"
psql -U postgres -c "CREATE USER dizco WITH PASSWORD 'your_strong_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE dizco_prod TO dizco;"
```

Set `DATABASE_URL=postgresql://dizco:your_strong_password@localhost:5432/dizco_prod` in your environment.

---

## Database Migrations (Alembic)

DIZCO uses Alembic for database migrations. **Always use Alembic on production** — never rely on `create_all()`.

```bash
cd server

# Check current migration status
alembic current

# Apply all pending migrations (run this on first production deployment)
alembic upgrade head

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe_your_change"

# Downgrade one step (use with caution)
alembic downgrade -1
```

> **Note**: The `ensure_schema_updates()` function in `database.py` exists for SQLite development convenience. It is NOT a substitute for Alembic in production.

---

## Backend Deployment (Render)

1. **Push to GitHub** — make sure no `.env` files are committed.

2. **Create a Render account** at [render.com](https://render.com).

3. **New Blueprint** — connect your GitHub repo. Render will detect `render.yaml` automatically.

4. **Set environment variables** in the Render dashboard under your service → Environment:

   ```
   ENVIRONMENT=production
   SECRET_KEY=<generate with: openssl rand -hex 32>
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=<your razorpay live secret>
   RAZORPAY_WEBHOOK_SECRET=<your webhook secret>
   CLOUDINARY_CLOUD_NAME=<your cloud name>
   CLOUDINARY_API_KEY=<your api key>
   CLOUDINARY_API_SECRET=<your api secret>
   SMTP_HOST=smtp.sendgrid.net
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=<your sendgrid api key>
   SMTP_FROM_EMAIL=orders@yourdomain.com
   FRONTEND_BASE_URL=https://your-dizco.vercel.app
   ALLOWED_ORIGINS=https://your-dizco.vercel.app
   ```

5. **Run database migration** — in Render's Shell or via the deploy hook:

   ```bash
   cd server && alembic upgrade head
   ```

6. **Verify** the health endpoint:

   ```
   GET https://your-api.onrender.com/health
   ```

---

## Frontend Deployment (Vercel)

1. **Push to GitHub**.

2. **Create a Vercel account** at [vercel.com](https://vercel.com).

3. **Import the repository** — set the **root directory** to `client/`.

4. **Set environment variables** in Vercel dashboard → Project → Settings → Environment Variables:

   ```
   VITE_API_URL=https://your-api.onrender.com/api
   ```

5. **Deploy** — Vercel runs `npm run build` automatically.

6. The `vercel.json` in `client/` handles SPA routing (React Router) and security headers.

---

## Cloudinary Configuration

1. Sign up at [cloudinary.com](https://cloudinary.com).
2. Go to Dashboard → Copy Cloud Name, API Key, API Secret.
3. Set the three variables in your backend environment.
4. Products without Cloudinary configured fall back to local `/uploads` storage automatically.

---

## SMTP Configuration

DIZCO supports any standard SMTP server. Recommended providers for production:

| Provider | SMTP Host | Port | Notes |
|---|---|---|---|
| SendGrid | `smtp.sendgrid.net` | 587 | Use API key as password |
| Mailgun | `smtp.mailgun.org` | 587 | Use domain SMTP credentials |
| AWS SES | `email-smtp.<region>.amazonaws.com` | 587 | Requires verified sender domain |

Transactional emails sent:
- Welcome email on registration
- Order confirmation after successful payment
- Password reset link

---

## Razorpay Configuration

1. Sign up at [razorpay.com](https://razorpay.com).
2. Use **Test mode** keys (`rzp_test_...`) for staging.
3. Use **Live mode** keys (`rzp_live_...`) for production.
4. Configure a webhook in the Razorpay dashboard:
   - **URL**: `https://your-api.onrender.com/api/orders/webhook`
   - **Events**: `payment.captured`, `payment.failed`
   - Copy the **Webhook Secret** and set `RAZORPAY_WEBHOOK_SECRET`.

> **Security**: In `production` mode, DIZCO enforces HMAC-SHA256 signature verification on every payment callback and webhook. Unsigned callbacks are rejected.

---

## CORS Configuration

Backend CORS allows:
- `http://localhost:5173` and `http://localhost:3000` (dev defaults)
- The value of `FRONTEND_BASE_URL` env var
- Any extra origins in `ALLOWED_ORIGINS` (comma-separated)

For production, set:
```
FRONTEND_BASE_URL=https://your-dizco.vercel.app
ALLOWED_ORIGINS=https://your-dizco.vercel.app
```

---

## Health Endpoint

```
GET /health
GET /api/health
```

Response:
```json
{
  "status": "online",
  "database": "connected",
  "platform": "DIZCO Fashion Commerce",
  "version": "1.0.0",
  "environment": "production"
}
```

Returns `status: "degraded"` if the database is unavailable — never exposes internal details.

---

## User Roles

| Role | Description | Access |
|---|---|---|
| `customer` | Registered shopper | Storefront, cart, checkout, orders, reviews, wishlist |
| `admin` | Store operator | Admin panel, products, categories, orders, coupons, reviews, customers |

Admin accounts are created by directly setting `role=admin` in the database or via seed data.

---

## Running Tests

```bash
cd server
.\venv312\Scripts\python.exe -m pytest -v
# Expected: 47/47 passed
```

**Test coverage includes:**
- Customer and admin authentication
- Product and category CRUD
- Variant stock management (order, insufficient stock, invalid variant)
- Coupon validation (expired, inactive, minimum order, usage limits, fixed/percentage)
- Order and payment flow (create → Razorpay → verify → stock decrement)
- Role-based access control (customer cannot access admin routes)
- Cloudinary service (upload, delete, fallback, file validation)
- Email service (SMTP failure handling, template rendering)

---

## Production Troubleshooting

### Server won't start (production mode)
```
FATAL CONFIGURATION ERROR: In production mode, a strong SECRET_KEY...
```
Generate a strong key: `openssl rand -hex 32`

### Database migration fails
```bash
alembic history        # check what's been applied
alembic current        # show current revision
alembic upgrade head   # apply all pending
```

### CORS error from frontend
Check that `ALLOWED_ORIGINS` and `FRONTEND_BASE_URL` match your actual frontend URL exactly (no trailing slash).

### Razorpay webhook signature failure
Verify `RAZORPAY_WEBHOOK_SECRET` matches what's configured in the Razorpay dashboard exactly.

### Emails not sending
Check SMTP credentials — DIZCO logs email errors at `ERROR` level without exposing credentials. SMTP failures do NOT fail orders.

---

## Deployment Checklist

Before going live, confirm:

- [ ] `ENVIRONMENT=production` set in backend
- [ ] Strong `SECRET_KEY` (32+ chars) set
- [ ] `DATABASE_URL` pointing to production PostgreSQL
- [ ] `alembic upgrade head` run on production database
- [ ] `FRONTEND_BASE_URL` and `ALLOWED_ORIGINS` set to actual frontend domain
- [ ] Razorpay **live** keys configured (not test keys)
- [ ] Razorpay webhook URL registered and secret configured
- [ ] Cloudinary credentials set (or local storage accepted as fallback)
- [ ] SMTP credentials set and sender email verified
- [ ] `VITE_API_URL` pointing to production backend in Vercel environment
- [ ] Frontend deployment successful (`npm run build` passes)
- [ ] Health endpoint responding: `GET /health` → `{"status": "online"}`
- [ ] Admin login working
- [ ] Customer registration working
- [ ] At least one test order placed with sandbox payment
