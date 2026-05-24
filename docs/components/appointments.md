# Appointments Component

## What It Is

`backend/routes/appointments.py` books appointments, filters schedules, and updates appointment status.

## Flow

1. The UI selects a patient, doctor, department, date, type, and reason.
2. FastAPI validates the request.
3. SQLite stores the appointment with status `scheduled`.
4. Status update actions change status to `scheduled`, `completed`, or `cancelled`.

## Inputs and Outputs

- Input: appointment JSON.
- Output: appointment JSON suitable for tables, strips, and analytics.

## Edge Cases

Date filtering uses SQLite date functions on `appointment_date`.
