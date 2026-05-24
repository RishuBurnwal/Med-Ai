# Testing Strategy

## Current Verification

- Python syntax compilation for all backend modules.
- Frontend production build with Vite.
- SQLite connectivity check through `DATABASE_URL`.
- Endpoint smoke tests against the seeded local database.

## Recommended Next Tests

1. Add pytest + httpx AsyncClient backend route tests.
2. Use a disposable SQLite database file.
3. Add Playwright smoke tests for login, patients, appointments, and dashboard.
4. Add API contract tests for AI endpoint response shapes.
5. Add frontend component tests for form validation and protected routing.

## Verified Smoke Coverage

- `/api/health`
- `/api/auth/login`
- `/api/auth/me`
- `/api/patients`, `/api/patients/stats`, `/api/patients/{id}`
- `/api/appointments`, `/api/appointments/today`, `/api/appointments/{id}/status`
- `/api/analytics/overview`, `/api/analytics/appointments-chart`, `/api/analytics/patients-by-blood-group`, `/api/analytics/patients-by-gender`, `/api/analytics/departments`
- `/api/ai/chat`, `/api/ai/quick-assessment`, `/api/ai/drug-interaction`, `/api/ai/drug-info`, `/api/ai/clinical-decision`, `/api/ai/summarize-notes`, `/api/ai/analyze-report`, `/api/ai/reports/{patient_id}`
