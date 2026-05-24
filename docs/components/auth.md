# Auth Component

## What It Is

`backend/routes/auth.py` implements user registration, login, JWT creation, current-user lookup, and role guards.

## Flow

1. `/auth/login` receives OAuth2 form data with `username` and `password`.
2. The route looks up the user by case-insensitive email.
3. Passlib verifies the bcrypt hash.
4. The route returns a signed JWT containing email and role.
5. Protected routes use `get_current_user`.
6. The default admin account is created automatically on first login or registration if the users table is empty.

## Inputs and Outputs

- Input: email/password form data or Bearer token.
- Output: JWT token or user object.

## Security Notes

Passwords are never returned. Queries are parameterized. Role checks are centralized.

## Limitations

Token revocation and refresh tokens are not implemented.
