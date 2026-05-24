# Main Goal

The main goal is to deliver an end-to-end intelligent hospital ecosystem where hospital staff can manage real operational records and use AI-assisted tools from a single secure dashboard.

## End-to-End User Outcome

A hospital admin or doctor should be able to:

1. Log in securely.
2. Register and search patients.
3. Book and update appointments.
4. View dashboard and analytics from live SQLite data.
5. Use AI clinical workflows for patient guidance, report analysis, drug interaction checks, and decision support.
6. Keep API keys and sensitive operations server-side.

## Correct Pipeline Behavior

```text
User action
  -> React form/table/chat interaction
  -> Axios request with JWT
  -> FastAPI validation and auth dependency
  -> SQLite transaction or query
  -> JSON response
  -> UI state update, toast, chart, or table refresh
```

For example, registering a patient sends a validated JSON body to `/api/patients`, creates a SQLite row with a generated `PAT-XXXX` identifier, returns the normalized patient object, and refreshes the patient table.

## Business Value

MedAI automates routine hospital workflows, centralizes patient/appointment data, demonstrates secure AI integration, and gives a clear educational narrative for foundation-model use in healthcare systems.
