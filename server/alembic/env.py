"""
Alembic migration environment — wired to DIZCO SQLAlchemy models.

DATABASE_URL is read from the application settings (environment variable)
so that both development (SQLite) and production (PostgreSQL) are supported
through the same migration pipeline.
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Path setup ────────────────────────────────────────────────────────────────
# Allow alembic to import the server app package when running from the server/
# directory (i.e. `alembic upgrade head` run inside D:\dizco\server).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Application imports ────────────────────────────────────────────────────────
from app.core.config import settings          # noqa: E402
from app.core.database import Base           # noqa: E402
import app.models.models as _models          # noqa: F401,E402  — registers all model classes on Base.metadata

# ── Alembic Config ─────────────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the value from our settings so that env vars
# (DATABASE_URL) are always authoritative — no hardcoded URL needed in alembic.ini.
config.set_main_option("sqlalchemy.url", settings.normalized_database_url)

# Apply logging config from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Wire autogenerate to our SQLAlchemy Base metadata.
target_metadata = Base.metadata


# ── Migration helpers ──────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Render column-level comments and compare server defaults for accuracy
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (requires live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
