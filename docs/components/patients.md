# Patients Component

## What It Is

`backend/routes/patients.py` owns patient CRUD, pagination, search, stats, and soft delete.

## Flow

1. Doctor/admin submits patient JSON.
2. Pydantic validates age, gender, and list fields.
3. The backend generates the next `PAT-XXXX` ID.
4. Clinical arrays are inserted into SQLite as JSON text.
5. List/search endpoints return paginated patient rows.

## Inputs and Outputs

- Input: patient form data from React.
- Output: normalized patient JSON with ID, timestamps, and arrays.

## Edge Cases

Soft delete keeps records for auditability. Empty updates return the existing row.

## Risks

`PAT-XXXX` generation is simple and adequate for this scope. For high-concurrency production, use a sequence-backed generated identifier.
