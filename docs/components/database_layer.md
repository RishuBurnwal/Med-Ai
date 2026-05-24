# Database Layer

## What It Is

`backend/config/database.py` provides the SQLite connection wrapper and schema bootstrap.

## Why It Exists

The app needs one consistent database abstraction so routes do not each manage connections or schema.

## How It Works

1. Reads `DATABASE_URL`.
2. Resolves a SQLite file path.
3. Opens an `aiosqlite` connection and applies pragmas.
4. Runs `initialize_schema`.
5. Exposes `require_pool()` for route dependencies.

## Interactions

All route modules call `require_db()` in `routes/common.py`, which returns the SQLite wrapper.

## Risks

Startup schema bootstrap is useful for a student/demo project. For a larger production deployment, replace it with a migration tool such as Alembic.
