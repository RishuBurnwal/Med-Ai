# Project Overview

MedAI is a full-stack hospital management and clinical AI demonstration system for a final-year B.Tech project. It exists to show how a hospital portal can combine operational workflows, role-based access, patient records, appointment scheduling, analytics, and foundation-model assisted clinical tools behind one professional UI.

## Architecture

```text
React/Vite frontend
  -> Axios API client with JWT
  -> FastAPI HTTP routes
  -> SQLite via an aiosqlite-backed async wrapper
  -> Optional external AI providers through backend-only API keys
```

The frontend is a premium dark SaaS-style hospital dashboard. It handles navigation, forms, charts, local session state, and user interactions. It does not call AI providers directly; all privileged operations go through FastAPI.

The backend is a FastAPI application. It owns authentication, authorization, validation, persistence, and AI endpoint orchestration. It stores durable application data in SQLite and creates the schema at startup for local development.

## Execution Flow

1. The user opens the React app at `localhost:5173`.
2. The login form posts `username` and `password` to `/api/auth/login`.
3. FastAPI verifies the bcrypt password hash stored in SQLite and returns a JWT.
4. The frontend stores `medai_token` and sends it on subsequent requests.
5. Protected backend routes decode the JWT and enforce role checks.
6. Patient, appointment, report, and analytics routes read/write SQLite through parameterized async queries that are normalized from the existing SQL shape.
7. AI routes accept clinical inputs, run deterministic demo logic now, and are structured to be replaced by provider service calls without exposing keys to the browser.

## Major Components

### Backend Entrypoint

`main.py` in the repository root loads `backend/.env`, imports the backend app, and runs the project from the workspace root.

`backend/main.py` creates the FastAPI app, configures CORS, starts the SQLite connection in lifespan startup, registers routers, and exposes `/api/health`.

### Database Layer

`backend/config/database.py` owns `DATABASE_URL`, the SQLite connection wrapper, schema bootstrap, indexes, constraints, and graceful shutdown.

### Auth

`backend/routes/auth.py` handles registration, OAuth2-compatible login, JWT creation, user lookup, and role dependencies.

### Patient Management

`backend/routes/patients.py` implements patient CRUD, patient ID generation, pagination, search, stats, JSONB clinical arrays, and soft delete.

### Appointments

`backend/routes/appointments.py` books appointments, lists with filters, returns today’s schedule, and updates status.

### AI Workflows

`backend/routes/ai_chatbot.py`, `report_analyzer.py`, `drug_checker.py`, and `clinical_support.py` expose medically scoped AI workflow APIs. The current implementation is deterministic and safe for demo; provider integration remains backend-only.

### Analytics

`backend/routes/analytics.py` aggregates SQLite data for dashboard cards and Recharts visualizations.

### Frontend

`frontend/src/App.jsx` defines protected routes. `frontend/src/components` provides shared layout, status badges, stat cards, model selector, charts, and topbar customization. `frontend/src/pages` implements each workflow screen.
