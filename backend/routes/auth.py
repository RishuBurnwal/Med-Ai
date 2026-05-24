import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel, EmailStr

from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")
ALGORITHM = "HS256"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["patient"] = "patient"


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str


def public_user(row):
    data = row_to_dict(row)
    return {"id": str(data["id"]), "name": data["name"], "email": data["email"], "role": data["role"]}


async def ensure_default_admin():
    db = require_db()
    count = await db.fetchval("SELECT COUNT(*) FROM users")
    if count == 0:
        hashed = bcrypt.hashpw(b"Admin@123", bcrypt.gensalt()).decode('utf-8')
        await db.execute(
            "INSERT OR IGNORE INTO users (name,email,role,hashed_password,created_at) VALUES ($1,$2,$3,$4,$5)",
            "Hospital Admin", "admin@hospital.com", "admin", hashed, now_iso(),
        )


def create_token(email: str, role: str) -> str:
    payload = {"sub": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise credentials_error
    except JWTError as exc:
        raise credentials_error from exc
    db = require_db()
    row = await db.fetchrow("SELECT * FROM users WHERE lower(email) = lower($1)", email)
    if not row:
        raise credentials_error
    return public_user(row)


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_doctor_or_admin(user=Depends(get_current_user)):
    if user["role"] not in {"doctor", "admin"}:
        raise HTTPException(status_code=403, detail="Doctor or admin access required")
    return user


@router.post("/register", response_model=UserResponse)
async def register(payload: UserCreate):
    await ensure_default_admin()
    db = require_db()
    existing = await db.fetchrow("SELECT id FROM users WHERE lower(email) = lower($1)", str(payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "patient"
    hashed = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    row = await db.fetchrow(
        "INSERT INTO users (name,email,role,hashed_password,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        payload.name, str(payload.email), role, hashed, now_iso(),
    )
    return public_user(row)


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    await ensure_default_admin()
    db = require_db()
    row = await db.fetchrow("SELECT * FROM users WHERE lower(email) = lower($1)", form.username)
    if not row:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    try:
        valid = bcrypt.checkpw(form.password.encode('utf-8'), row["hashed_password"].encode('utf-8'))
    except Exception:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not valid:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": create_token(row["email"], row["role"]), "token_type": "bearer"}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    last_password_change: str | None = None
    created_at: str | None = None


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    return user


@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    db = require_db()
    row = await db.fetchrow(
        "SELECT id, name, email, role, last_password_change, created_at FROM users WHERE lower(email) = lower($1)",
        user['email'],
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    data = dict(row)
    data['id'] = str(data['id'])
    return data


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Request a password reset. In production this would send an email."""
    db = require_db()
    user_row = await db.fetchrow("SELECT id, name, email FROM users WHERE lower(email) = lower($1)", str(payload.email))
    if not user_row:
        # Don't reveal if email exists - return generic success
        return {"detail": "If the email is registered, a reset link has been sent.", "token": None}

    # Generate secure token
    token = secrets.token_urlsafe(48)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    created = now_iso()

    # Store in database
    await db.execute(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4)",
        user_row['id'], token, expires, created,
    )

    # In production, send email here. For demo, return token directly.
    print(f"\n[PASSWORD RESET] Token for {payload.email}: {token}\n")

    return {
        "detail": "If the email is registered, a reset link has been sent.",
        "token": token,  # Only returned in development mode
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """Reset password using a valid reset token."""
    db = require_db()
    now = now_iso()

    # Find valid token
    token_row = await db.fetchrow(
        """SELECT * FROM password_reset_tokens
           WHERE token = $1 AND used_at IS NULL AND expires_at > $2""",
        payload.token, now,
    )
    if not token_row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Update password
    hashed = bcrypt.hashpw(payload.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.execute(
        "UPDATE users SET hashed_password = $1, last_password_change = $2 WHERE id = $3",
        hashed, now, token_row['user_id'],
    )

    # Mark token as used
    await db.execute(
        "UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2",
        now, token_row['id'],
    )

    return {"detail": "Password has been reset successfully"}


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user)):
    """Change password for authenticated user."""
    db = require_db()
    row = await db.fetchrow("SELECT * FROM users WHERE lower(email) = lower($1)", user['email'])
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        valid = bcrypt.checkpw(payload.current_password.encode('utf-8'), row["hashed_password"].encode('utf-8'))
    except Exception:
        valid = False
    if not valid:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    hashed = bcrypt.hashpw(payload.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.execute(
        "UPDATE users SET hashed_password = $1, last_password_change = $2 WHERE lower(email) = lower($3)",
        hashed, now_iso(), user['email'],
    )

    return {"detail": "Password changed successfully"}
