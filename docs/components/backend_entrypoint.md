# Backend Entrypoint

## What It Is

`backend/main.py` is the FastAPI application entrypoint. The repository-root `main.py` is the user-facing launcher that loads `backend/.env` and imports this app.

## Why It Exists

It centralizes app construction, lifecycle management, CORS policy, router registration, and health checks.

## Step-by-Step Flow

1. Uvicorn imports `main:app`.
2. FastAPI lifespan starts.
3. `connect_to_postgres()` initializes the SQLite connection and schema.
4. Routers handle `/api/*` requests.
5. Lifespan shutdown closes the SQLite connection.

## Inputs and Outputs

- Input: HTTP requests.
- Output: JSON API responses.

## Edge Cases

If SQLite cannot be opened or `DATABASE_URL` is wrong, startup fails loudly instead of serving a partially broken app.
