# SQLite Schema

The backend uses SQLite only. Runtime access goes through an async wrapper over `aiosqlite`.

## Tables

### users

Stores hospital users and role claims. Email is unique and looked up case-insensitively.

### patients

Stores active and soft-deleted patient records. Medical history, allergies, and current medications are JSONB arrays to preserve structured clinical data.

### appointments

Stores appointment bookings and statuses. Date and status indexes support filtering and dashboard analytics.

### report_analyses

Stores uploaded report analysis output and optional patient association.

## Constraints and Indexes

- Role/status/gender values are constrained.
- Patient age is bounded between 0 and 150.
- Search indexes exist for patient name and patient ID.
- Appointment indexes exist for patient ID, date, and status.

## Security

All application queries are parameterized. The database layer normalizes the existing SQL shape into SQLite-compatible statements before execution. No user input is string-concatenated into SQL except controlled column names generated from validated Pydantic model keys.
