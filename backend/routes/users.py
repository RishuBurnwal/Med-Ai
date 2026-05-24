from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from typing import Literal

from routes.auth import get_current_user, require_admin
from routes.common import now_iso, require_db, row_to_dict
import bcrypt

router = APIRouter()


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = 'User@123'
    role: Literal['admin', 'doctor', 'patient', 'staff'] = 'staff'


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role: Literal['admin', 'doctor', 'patient', 'staff'] | None = None
    is_active: bool | None = None
    password: str | None = None


def user_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    data.pop('hashed_password', None)
    return data


@router.get('')
async def list_users(
    role: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(require_admin),
):
    db = require_db()
    offset = max(page - 1, 0) * limit
    where = "WHERE 1=1"
    params = []
    if role:
        params.append(role)
        where += f" AND role = ${len(params)}"
    if search:
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
        where += f" AND (LOWER(name) LIKE ${len(params)-1} OR LOWER(email) LIKE ${len(params)})"
    total = await db.fetchval(f"SELECT COUNT(*) FROM users {where}", *params)
    limit_param = len(params) + 1
    offset_param = len(params) + 2
    rows = await db.fetch(
        f"SELECT id, name, email, role, is_active, created_at FROM users {where} ORDER BY id DESC LIMIT ${limit_param} OFFSET ${offset_param}",
        *params, limit, offset,
    )
    return {"users": [user_row(row) for row in rows], "total": total, "page": page, "limit": limit}


@router.post('')
async def create_user(payload: UserCreate, user=Depends(require_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT id FROM users WHERE lower(email) = lower($1)", str(payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    row = await db.fetchrow(
        "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5) RETURNING id, name, email, role, is_active, created_at",
        payload.name, str(payload.email), payload.role, hashed, now_iso(),
    )
    return user_row(row)


@router.get('/{user_id}')
async def get_user(user_id: str, user=Depends(require_admin)):
    row = await require_db().fetchrow(
        "SELECT id, name, email, role, is_active, created_at FROM users WHERE id::text = $1", user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return user_row(row)


@router.put('/{user_id}')
async def update_user(user_id: str, payload: UserUpdate, user=Depends(require_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if 'password' in data:
        data['hashed_password'] = bcrypt.hashpw(data.pop('password').encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if not data:
        return user_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    params.append(user_id)
    await db.execute(
        f"UPDATE users SET {', '.join(fields)} WHERE id::text = ${len(params)}", *params,
    )
    return await get_user(user_id, user)


@router.delete('/{user_id}')
async def delete_user(user_id: str, user=Depends(require_admin)):
    if user_id == str(user['id']):
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    await require_db().execute("UPDATE users SET is_active = 0 WHERE id::text = $1", user_id)
    return {"detail": "User deactivated"}
