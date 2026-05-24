# AGENT NOTES

## Phase 0 Discovery

- Stack: Vite + React frontend, FastAPI backend, SQLite runtime via `aiosqlite`.
- Entrypoints: `frontend/src/main.jsx`, `frontend/src/App.jsx`, repo-root `main.py`, `backend/main.py`.
- Existing tests: none.
- Dev server: `npm run dev` on port 5173.
- Backend launcher: `python main.py` from repo root starts the app and loads `backend/.env`.

## Static Analysis Baseline

- `npm run build` succeeds.
- Build warning: one large bundle chunk over 500 kB after minification.
- No app TODO/FIXME or console.log residue found in source trees.

## Iteration 0 Findings

- Need Playwright harness for live smoke, visual, and a11y coverage.
- Need a combined dev launcher so Playwright can start frontend + backend automatically.
- Need endpoint-level smoke coverage because browser routes alone do not prove API health.

## Test Plan

- Public route smoke: `/login`, `/`.
- Auth journey: login with seeded admin.
- CRUD journey: patient create, appointment create/update.
- AI journey: chatbot, clinical support, drug checker, report analyzer.
- A11y: login, dashboard, patients, appointments, analytics.
- Visual: mobile/tablet/desktop screenshots saved under `test-results/screenshots/`.
# Agent QA Notes

## Phase 0 — Project Report

- Stack: React 18 + Vite frontend, FastAPI backend, SQLite-backed async database wrapper in the currently runnable project.
- Package manager: npm.
- Frontend entry points: `src/main.jsx`, `src/App.jsx`.
- Backend entry points: repository-root `main.py` and `backend/main.py`.
- Tests: Playwright e2e, a11y, visual under `frontend/tests`.
- Dev server: Vite on `127.0.0.1:5173`; backend expected on `127.0.0.1:8000`.
- Obvious issue: `playwright.config.ts` only starts Vite, while tests require the backend. Existing `tests/global-setup.ts` can start/seed backend but is not wired into config.
- Repository status: not a git repository, so requested per-iteration commits cannot be created.

## Phase 2 — Static Analysis

- `npm run build`: passes, with only Vite chunk-size warning.
- Backend `py_compile`: passes.

## Iteration 1 - Findings

- Full Playwright suite: 36 passed, 3 failed.
- Failed test: authenticated CRUD journey in chromium, webkit, and firefox.
- Failure: timed out waiting for `getByLabel(/Chat input|textarea/i)` after navigating to AI Chatbot.
- Diagnosis: `Chatbot.jsx` rendered an unlabeled textarea. This is a real accessibility/testability bug.
- Fix: added `aria-label="Chat input"` to the chatbot textarea.
- Commit status: skipped because this workspace is not a git repository.

## Iteration 2 - Findings

- Re-run failed authenticated journey: chat input lookup passed.
- New failure: Analytics heading assertion hit strict-mode ambiguity because Topbar rendered the current page title as an `h2` while the page rendered the actual `h1`.
- Diagnosis: duplicate semantic headings for the same page title.
- Fix: changed Topbar page title from `h2` to non-heading text with an accessible current-page label.
- Commit status: skipped because this workspace is not a git repository.

## Iteration 3 - Findings

- Re-run failed authenticated journey: Analytics ambiguity fixed.
- New failure: login helper could not find a Dashboard heading after Topbar was made non-semantic.
- Diagnosis: Dashboard page lacked its own main `h1`; it had been relying on the app chrome title.
- Fix: added a Dashboard `h1` and descriptive subtitle to `Dashboard.jsx`.
- Commit status: skipped because this workspace is not a git repository.

## Iteration 4 - Findings

- Re-run failed authenticated journey: Dashboard heading fixed.
- New failure: Patients heading with `exact: true` was not found because the count was inside the `h1`, changing its accessible name.
- Diagnosis: page heading should not include dynamic count in the accessible name.
- Fix: moved count into a sibling element with its own aria-label.
- Commit status: skipped because this workspace is not a git repository.

## Iteration 5 - Findings

- Re-run failed authenticated journey: Patients heading fixed.
- New failure: Appointments heading with `exact: true` was not found because the today-count was inside the `h1`.
- Diagnosis: dynamic badge text should not be part of the page heading accessible name.
- Fix: moved the today-count into a sibling badge with an aria-label.
- Commit status: skipped because this workspace is not a git repository.

## Iteration 6 - Findings

- Full suite mostly passed, but Chromium had two flaky failures.
- Failure A: patient form input detached during fill while page data was still settling.
- Failure B: dashboard screenshot login occasionally stayed on `/login`, indicating backend/dev lifecycle race.
- Diagnosis: Playwright config was not using the existing backend global setup, and the CRUD test interacted before waiting for the patients GET response.
- Fix: wired `globalSetup`/`globalTeardown`, hardened global setup backend health handling, waited for login/patients/create network responses in the e2e journey.
- Commit status: skipped because this workspace is not a git repository.

## Iteration 7 - Findings
- Playwright global setup timed out because backend/seed.py completed writes but did not close the async SQLite connection, leaving the process alive.
- Fixed seed.py to always close the database connection in a finally block after seeding.
- Git commit requested by guide could not be created because this workspace is not a git repository.


## Iteration 8 - Findings
- Focused Chromium run reached browser tests after seed fix.
- Playwright harness used expect(response).toBeOK() on page Response objects; replaced with response.ok() assertions.
- global-teardown.ts needed to export a single function for Playwright; wrapped cleanup logic in default async function.
- Git commit requested by guide could not be created because this workspace is not a git repository.


## Iteration 10 - Findings
- Full cross-browser run: 35 passed, 4 failed.
- Backend showed a real concurrency bug under parallel Playwright/API load: SQLite shared connection raised cannot start a transaction within a transaction.
- Fixed SQLiteDatabase with an async lock and task-local transaction depth to serialize independent DB operations and preserve nested transaction support.
- A11y login helper could race navigation under parallel load; added explicit login response wait and removed noisy console logging from the test.
- Git commit requested by guide could not be created because this workspace is not a git repository.


## Iteration 11 - Findings
- Targeted rerun passed the a11y and API failures but still exposed CRUD instability under cross-browser parallelism.
- SQLite now connects with isolation_level=None so explicit BEGIN/COMMIT logic cannot conflict with implicit driver transactions.
- Hardened E2E route navigation waits so link clicks are paired with URL changes and the intended network response.
- Git commit requested by guide could not be created because this workspace is not a git repository.


## Iteration 12 - Findings
- Full Playwright suite passed across Chromium, WebKit, and Firefox with one worker: 39 passed.
- The suite mutates shared seeded data, so Playwright config now uses workers: 1 for deterministic normal runs.
- Git commit requested by guide could not be created because this workspace is not a git repository.


## Iteration 13 - Findings
- Production preview smoke initially failed login because backend CORS allowed dev origins but not Vite preview origins on port 4173.
- Added localhost/127.0.0.1:4173 to FastAPI CORS allowlist.
- Production preview smoke plus authenticated CRUD journey now pass in Chromium: 3 passed.
- Git commit requested by guide could not be created because this workspace is not a git repository.

