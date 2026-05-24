# Core Components

## Component Tree

```text
frontend/src/main.jsx
  -> App.jsx
    -> AuthProvider
    -> PrivateRoute
    -> Layout
      -> Sidebar
      -> Topbar
    -> pages/*
      -> services/api.js
        -> main.py (repo-root launcher)
          -> backend/main.py
            -> config/database.py (SQLite)
          -> routes/auth.py
          -> routes/patients.py
          -> routes/appointments.py
          -> routes/analytics.py
          -> routes/ai_chatbot.py
          -> routes/report_analyzer.py
          -> routes/drug_checker.py
          -> routes/clinical_support.py
```

## Database Layer

`config/database.py` creates an aiosqlite-backed connection wrapper, bootstraps schema, adds indexes, and closes the connection on app shutdown. Queries are normalized from the existing `$1` style into SQLite-compatible placeholders.

## API Layer

Routes use FastAPI + Pydantic for request validation. Authentication is centralized through `get_current_user`, `require_admin`, and `require_doctor_or_admin`.

## Business Logic Layer

Business logic is currently colocated with route handlers because the project size is small. Each route owns one bounded domain: auth, patients, appointments, analytics, reports, drugs, chatbot, or clinical support.

## Frontend Layer

React pages call the backend through a shared Axios instance. The UI uses reusable components for layout, navigation, cards, badges, loading states, empty states, and charts.

## Config

- `backend/.env`: runtime secrets and `DATABASE_URL`.
- `backend/.env.example`: safe template.
- `frontend/vite.config.js`: dev proxy to FastAPI.
- `frontend/src/services/api.js`: browser API base URL and JWT interceptor.

## Notes

- The repository-root `main.py` is the user-facing launcher for `python main.py`.
- The backend currently uses deterministic AI responses with provider-aware fields in the payloads; provider keys stay server-side for future integration.

## Additional Docs

- `docs/db_schema.md`
- `docs/testing_strategy.md`
- `docs/components/*.md`
