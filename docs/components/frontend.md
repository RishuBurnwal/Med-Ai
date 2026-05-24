# Frontend Component

## What It Is

The frontend is a React 18 + Vite application with Tailwind styling and Recharts visualizations.

## Flow

1. `main.jsx` mounts React.
2. `App.jsx` provides routes and protected route behavior.
3. `AuthContext` restores/stores JWT session state.
4. Pages call the backend through `services/api.js`.
5. Shared components provide layout, charts, badges, loading states, and clock/theme customization.

## Inputs and Outputs

- Input: user form interactions and route navigation.
- Output: authenticated dashboard, CRUD pages, AI pages, and analytics charts.

## Edge Cases

401 responses clear session storage and redirect to login. Mobile layout uses an overlay sidebar.
