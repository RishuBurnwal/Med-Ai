# MedAI Agent QA Report

Generated: 2026-05-22

## Initial State

The project is a FastAPI + React/Vite hospital management system with Playwright tests already present. The test suite had remaining flakiness around authenticated CRUD, incomplete Playwright backend lifecycle wiring, and backend instability under concurrent test traffic. Production preview also had a CORS gap.

This workspace is not a git repository, so the requested per-iteration commits could not be created. Iteration notes were recorded in `frontend/AGENT_NOTES.md` instead.

## Bugs Found And Fixed

### Critical

- Backend seed process never exited.
  - Cause: `backend/seed.py` opened the async SQLite connection and never closed it.
  - Fix: close the database connection in a `finally` block after seeding.

- Backend transaction failures under test/API concurrency.
  - Cause: multiple requests shared one SQLite connection and could start overlapping transactions.
  - Fix: added an async DB lock, task-local transaction depth, explicit autocommit mode, and safe cursor cleanup in `backend/config/database.py`.

- Production preview login failed.
  - Cause: CORS allowed Vite dev origins but not Vite preview origins.
  - Fix: added `http://localhost:4173` and `http://127.0.0.1:4173` to FastAPI CORS origins.

### High

- Playwright backend lifecycle was incomplete.
  - Cause: `global-setup.ts` and `global-teardown.ts` existed but were not wired into config; teardown did not export a Playwright function.
  - Fix: wired global setup/teardown into `playwright.config.ts` and exported teardown correctly.

- Direct backend startup left reload child processes in tests.
  - Cause: `python backend/main.py` launched Uvicorn with `reload=True`.
  - Fix: changed direct runner to `reload=False`; developers can still run `uvicorn main:app --reload`.

- E2E navigation and response waits were racy.
  - Cause: tests waited on network responses without guaranteeing route transitions.
  - Fix: paired link clicks with URL waits and targeted response waits.

### Medium

- Accessibility test login was racy and noisy.
  - Cause: login helper did not wait for the auth response; test logged axe JSON to console.
  - Fix: added auth response wait and removed console logging.

- Chatbot input lacked a stable accessible label.
  - Fix: added `aria-label="Chat input"`.

- Duplicate or unstable headings affected a11y/locator assertions.
  - Fix: changed topbar title from a semantic heading to labeled non-heading text, added a real Dashboard `h1`, and split dynamic count badges out of Patients/Appointments headings.

- Vite production build emitted a large chunk warning.
  - Fix: split React, charts, icons, and vendor code via Rollup `manualChunks`.

## Verification Results

### Static / Build

- `backend/.venv/Scripts/python.exe -m py_compile main.py config/database.py seed.py`
  - Passed.

- `npm run build`
  - Passed with no warnings after chunk splitting.

- `rg "console\.log|debugger" frontend/src frontend/tests backend`
  - No matches.

### Full Playwright Suite

Command:

```bash
npx playwright test --reporter=list,html
```

Result:

- 39 passed
- Browsers: Chromium, WebKit, Firefox
- Coverage: a11y, backend API flow, authenticated CRUD journey, public route smoke, responsive screenshots, visual snapshot
- Serious/critical axe violations: 0
- Happy-path network failures: 0 in tested flows

### Production Preview Smoke

Command:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 PLAYWRIGHT_WEB_SERVER_COMMAND="npm run preview -- --host 127.0.0.1 --port 4173" npx playwright test tests/e2e/app.spec.ts -g "public routes|navigates key screens" --project=chromium --reporter=list
```

Result:

- 3 passed
- Public routes loaded
- Authenticated CRUD journey passed against the production bundle

## Screenshots

- `frontend/test-results/screenshots/dashboard__mobile.png`
- `frontend/test-results/screenshots/dashboard__tablet.png`
- `frontend/test-results/screenshots/dashboard__desktop.png`

## Changed Files

- `backend/config/database.py`
- `backend/main.py`
- `backend/seed.py`
- `frontend/playwright.config.ts`
- `frontend/vite.config.js`
- `frontend/tests/global-setup.ts`
- `frontend/tests/global-teardown.ts`
- `frontend/tests/e2e/app.spec.ts`
- `frontend/tests/a11y/a11y.spec.ts`
- `frontend/src/components/Topbar.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Patients.jsx`
- `frontend/src/pages/Appointments.jsx`
- `frontend/src/pages/Chatbot.jsx`
- `frontend/AGENT_NOTES.md`

## Remaining Notes

- The workspace is not under git, so no commit hashes are available.
- The Playwright suite is intentionally configured with `workers: 1` because the tests mutate shared seeded demo data. This keeps the test run deterministic.
- The backend currently reports SQLite in `/api/health`; this matches the current local implementation.

## Production Readiness

The tested frontend/backend paths are production-ready for the current demo architecture: build passes, cross-browser Playwright passes, production preview smoke passes, critical CRUD flows work, and serious/critical accessibility violations are cleared.
