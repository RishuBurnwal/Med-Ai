# Analytics Component

## What It Is

`backend/routes/analytics.py` aggregates SQLite data for dashboard and analytics charts.

## Flow

1. Frontend requests overview or chart endpoints.
2. SQLite counts patients and appointments.
3. Aggregated rows are returned in Recharts-friendly shapes.

## Inputs and Outputs

- Input: optional time range query such as `days=30`.
- Output: overview cards, appointment chart points, blood group distribution, gender distribution, and department counts.

## Limitations

Bed occupancy is still demo-derived because no bed management module exists yet.
