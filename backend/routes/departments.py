from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from routes.auth import get_current_user, require_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


class DepartmentCreate(BaseModel):
    name: str
    description: str = ''
    head_doctor: str | None = None
    location: str = ''
    phone: str = ''


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    head_doctor: str | None = None
    location: str | None = None
    phone: str | None = None
    is_active: bool | None = None


def dept_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    return data


@router.post('')
async def create_department(payload: DepartmentCreate, user=Depends(require_admin)):
    db = require_db()
    created = now_iso()
    try:
        await db.execute(
            """INSERT INTO departments (name,description,head_doctor,location,phone,is_active,created_at)
               VALUES ($1,$2,$3,$4,$5,1,$6)""",
            payload.name, payload.description, payload.head_doctor, payload.location, payload.phone, created,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Department already exists")
    row = await db.fetchrow("SELECT * FROM departments WHERE name = $1", payload.name)
    return dept_row(row)


@router.get('')
async def list_departments(user=Depends(get_current_user)):
    rows = await require_db().fetch(
        """SELECT d.*, (SELECT COUNT(*) FROM staff s WHERE s.department_id = d.id AND s.is_active = 1) as staff_count,
                  (SELECT COUNT(*) FROM wards w WHERE w.department_id = d.id AND w.is_active = 1) as ward_count
           FROM departments d WHERE d.is_active = 1 ORDER BY d.name"""
    )
    return [dept_row(row) for row in rows]


@router.get('/{dept_id}')
async def get_department(dept_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow("SELECT * FROM departments WHERE (id::text = $1 OR name = $1) AND is_active = 1", dept_id)
    if not row:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept_row(row)


@router.put('/{dept_id}')
async def update_department(dept_id: str, payload: DepartmentUpdate, user=Depends(require_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM departments WHERE id::text = $1 AND is_active = 1", dept_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Department not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return dept_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    params.append(dept_id)
    await db.execute(
        f"UPDATE departments SET {', '.join(fields)} WHERE id::text = ${len(params)}",
        *params,
    )
    return await get_department(dept_id, user)


@router.delete('/{dept_id}')
async def delete_department(dept_id: str, user=Depends(require_admin)):
    await require_db().execute("UPDATE departments SET is_active = 0 WHERE id::text = $1", dept_id)
    return {"detail": "Department deleted"}
