from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal

from routes.auth import get_current_user, require_admin
from routes.common import now_iso, require_db, row_to_dict, parse_json_list

router = APIRouter()


class StaffCreate(BaseModel):
    name: str
    email: str
    phone: str
    role: Literal['doctor','nurse','receptionist','pharmacist','lab_technician','admin','accountant']
    specialization: str = ''
    department_id: int | None = None
    qualification: str = ''
    experience_years: int = 0
    salary: float = 0
    password: str = 'Staff@123'


class StaffUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    role: Literal['doctor','nurse','receptionist','pharmacist','lab_technician','admin','accountant'] | None = None
    specialization: str | None = None
    department_id: int | None = None
    qualification: str | None = None
    experience_years: int | None = None
    salary: float | None = None
    is_active: bool | None = None


def staff_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    data['department_id'] = str(data['department_id']) if data.get('department_id') else None
    return data


@router.post('')
async def create_staff(payload: StaffCreate, user=Depends(require_admin)):
    db = require_db()
    created = now_iso()
    import bcrypt
    hashed = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    temp_staff_id = f"TMP-{uuid4().hex[:8]}"

    async with db.transaction():
        # Create user account
        await db.execute(
            "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5)",
            payload.name, payload.email, 'staff', hashed, created,
        )
        user_row = await db.fetchrow("SELECT id FROM users WHERE email = $1", payload.email)
        user_id = user_row['id']

        # Create staff record
        row_id = await db.execute(
            """INSERT INTO staff (staff_id,user_id,name,email,phone,role,specialization,department_id,qualification,experience_years,salary,joining_date,created_at,updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
            temp_staff_id, user_id, payload.name, payload.email, payload.phone, payload.role,
            payload.specialization, payload.department_id, payload.qualification,
            payload.experience_years, payload.salary, created, created, created,
        )
        staff_id = f"STF-{int(row_id):04d}"
        await db.execute("UPDATE staff SET staff_id = $1 WHERE id = $2", staff_id, row_id)
        row = await db.fetchrow("SELECT * FROM staff WHERE id = $1", row_id)
    return staff_row(row)


@router.get('')
async def list_staff(
    role: str | None = None,
    department_id: int | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
):
    db = require_db()
    offset = max(page - 1, 0) * limit
    where = "WHERE s.is_active = 1"
    params = []
    if role:
        params.append(role)
        where += f" AND s.role = ${len(params)}"
    if department_id:
        params.append(department_id)
        where += f" AND s.department_id = ${len(params)}"
    if search:
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
        where += f" AND (LOWER(s.name) LIKE ${len(params)-1} OR LOWER(s.email) LIKE ${len(params)})"

    count_params = list(params)
    total = await db.fetchval(f"SELECT COUNT(*) FROM staff s {where}", *count_params)

    limit_param = len(params) + 1
    offset_param = len(params) + 2
    rows = await db.fetch(
        f"""SELECT s.*, d.name as department_name FROM staff s
            LEFT JOIN departments d ON s.department_id = d.id
            {where} ORDER BY s.id DESC LIMIT ${limit_param} OFFSET ${offset_param}""",
        *params, limit, offset,
    )
    staff_list = [staff_row(row) for row in rows]
    return {"staff": staff_list, "total": total, "page": page, "limit": limit}


@router.get('/stats')
async def staff_stats(user=Depends(get_current_user)):
    db = require_db()
    total = await db.fetchval("SELECT COUNT(*) FROM staff WHERE is_active = 1")
    by_role = await db.fetch("SELECT role, COUNT(*) as count FROM staff WHERE is_active = 1 GROUP BY role")
    doctors = await db.fetchval("SELECT COUNT(*) FROM staff WHERE is_active = 1 AND role = 'doctor'")
    return {
        "total": total,
        "doctors": doctors,
        "by_role": {row['role']: row['count'] for row in by_role},
    }


@router.get('/{staff_id}')
async def get_staff(staff_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow(
        """SELECT s.*, d.name as department_name FROM staff s
           LEFT JOIN departments d ON s.department_id = d.id
           WHERE (s.id::text = $1 OR s.staff_id = $1) AND s.is_active = 1""",
        staff_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff_row(row)


@router.put('/{staff_id}')
async def update_staff(staff_id: str, payload: StaffUpdate, user=Depends(require_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM staff WHERE (id::text = $1 OR staff_id = $1) AND is_active = 1", staff_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Staff not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return staff_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    fields.append(f"updated_at = ${len(params) + 1}")
    params.append(now_iso())
    params.append(staff_id)
    await db.execute(
        f"UPDATE staff SET {', '.join(fields)} WHERE id::text = ${len(params)} OR staff_id = ${len(params)}",
        *params,
    )
    return await get_staff(staff_id, user)


@router.delete('/{staff_id}')
async def delete_staff(staff_id: str, user=Depends(require_admin)):
    await require_db().execute(
        "UPDATE staff SET is_active = 0, updated_at = $1 WHERE id::text = $2 OR staff_id = $2",
        now_iso(), staff_id,
    )
    return {"detail": "Staff deactivated"}
