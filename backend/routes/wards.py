from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from routes.auth import get_current_user, require_admin, require_doctor_or_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


# ── Wards ──

class WardCreate(BaseModel):
    ward_number: str
    name: str
    floor: int = 1
    department_id: int | None = None
    total_beds: int = 10
    available_beds: int = 10


class WardUpdate(BaseModel):
    name: str | None = None
    floor: int | None = None
    department_id: int | None = None
    total_beds: int | None = None
    available_beds: int | None = None
    is_active: bool | None = None


def ward_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    data['department_id'] = str(data['department_id']) if data.get('department_id') else None
    return data


@router.post('')
async def create_ward(payload: WardCreate, user=Depends(require_admin)):
    db = require_db()
    created = now_iso()
    try:
        await db.execute(
            """INSERT INTO wards (ward_number,name,floor,department_id,total_beds,available_beds,is_active,created_at)
               VALUES ($1,$2,$3,$4,$5,$6,1,$7)""",
            payload.ward_number, payload.name, payload.floor, payload.department_id,
            payload.total_beds, payload.available_beds, created,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Ward number already exists")
    row = await db.fetchrow("SELECT * FROM wards WHERE ward_number = $1", payload.ward_number)
    return ward_row(row)


@router.get('')
async def list_wards(department_id: int | None = None, user=Depends(get_current_user)):
    db = require_db()
    where = "WHERE w.is_active = 1"
    params = []
    if department_id:
        params.append(department_id)
        where += f" AND w.department_id = ${len(params)}"
    rows = await db.fetch(
        f"""SELECT w.*, d.name as department_name FROM wards w
            LEFT JOIN departments d ON w.department_id = d.id
            {where} ORDER BY w.floor, w.name""",
        *params,
    )
    return [ward_row(row) for row in rows]


@router.get('/stats')
async def ward_stats(user=Depends(get_current_user)):
    db = require_db()
    total_wards = await db.fetchval("SELECT COUNT(*) FROM wards WHERE is_active = 1")
    total_beds_total = await db.fetchval("SELECT SUM(total_beds) FROM wards WHERE is_active = 1") or 0
    total_available = await db.fetchval("SELECT SUM(available_beds) FROM wards WHERE is_active = 1") or 0
    occupied = total_beds_total - total_available
    occupancy_rate = round((occupied / total_beds_total) * 100, 1) if total_beds_total > 0 else 0
    return {
        "total_wards": total_wards,
        "total_beds": total_beds_total,
        "available_beds": total_available,
        "occupied_beds": occupied,
        "occupancy_rate": occupancy_rate,
    }


@router.get('/{ward_id}')
async def get_ward(ward_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow(
        """SELECT w.*, d.name as department_name FROM wards w
           LEFT JOIN departments d ON w.department_id = d.id
           WHERE (w.id::text = $1 OR w.ward_number = $1) AND w.is_active = 1""",
        ward_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Ward not found")
    return ward_row(row)


@router.put('/{ward_id}')
async def update_ward(ward_id: str, payload: WardUpdate, user=Depends(require_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM wards WHERE id::text = $1 AND is_active = 1", ward_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Ward not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return ward_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    params.append(ward_id)
    await db.execute(f"UPDATE wards SET {', '.join(fields)} WHERE id::text = ${len(params)}", *params)
    return await get_ward(ward_id, user)


@router.delete('/{ward_id}')
async def delete_ward(ward_id: str, user=Depends(require_admin)):
    await require_db().execute("UPDATE wards SET is_active = 0 WHERE id::text = $1", ward_id)
    return {"detail": "Ward deleted"}


# ── Beds ──

class BedCreate(BaseModel):
    bed_number: str
    ward_id: int
    room_number: str
    bed_type: Literal['general','semi_private','private','icu','nicu','emergency'] = 'general'
    status: Literal['available','occupied','maintenance','reserved'] = 'available'


class BedUpdate(BaseModel):
    room_number: str | None = None
    bed_type: Literal['general','semi_private','private','icu','nicu','emergency'] | None = None
    status: Literal['available','occupied','maintenance','reserved'] | None = None
    current_patient_id: str | None = None
    assigned_doctor: str | None = None
    admission_date: str | None = None


def bed_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    data['ward_id'] = str(data['ward_id'])
    return data


@router.post('/beds')
async def create_bed(payload: BedCreate, user=Depends(require_admin)):
    db = require_db()
    created = now_iso()
    try:
        await db.execute(
            """INSERT INTO beds (bed_number,ward_id,room_number,bed_type,status,is_active,created_at)
               VALUES ($1,$2,$3,$4,$5,1,$6)""",
            payload.bed_number, payload.ward_id, payload.room_number, payload.bed_type, payload.status, created,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Bed number already exists")
    row = await db.fetchrow("SELECT * FROM beds WHERE bed_number = $1", payload.bed_number)
    return bed_row(row)


@router.get('/beds')
async def list_beds(
    ward_id: int | None = None,
    status: str | None = None,
    bed_type: str | None = None,
    user=Depends(get_current_user),
):
    db = require_db()
    where = "WHERE b.is_active = 1"
    params = []
    if ward_id:
        params.append(ward_id)
        where += f" AND b.ward_id = ${len(params)}"
    if status:
        params.append(status)
        where += f" AND b.status = ${len(params)}"
    if bed_type:
        params.append(bed_type)
        where += f" AND b.bed_type = ${len(params)}"
    rows = await db.fetch(
        f"""SELECT b.*, w.name as ward_name, w.ward_number, w.floor
            FROM beds b LEFT JOIN wards w ON b.ward_id = w.id
            {where} ORDER BY w.floor, w.name, b.room_number""",
        *params,
    )
    return [bed_row(row) for row in rows]


@router.get('/beds/{bed_id}')
async def get_bed(bed_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow(
        """SELECT b.*, w.name as ward_name, w.ward_number, w.floor
           FROM beds b LEFT JOIN wards w ON b.ward_id = w.id
           WHERE (b.id::text = $1 OR b.bed_number = $1) AND b.is_active = 1""",
        bed_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bed not found")
    return bed_row(row)


@router.put('/beds/{bed_id}')
async def update_bed(bed_id: str, payload: BedUpdate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM beds WHERE id::text = $1 AND is_active = 1", bed_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Bed not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return bed_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    params.append(bed_id)
    await db.execute(f"UPDATE beds SET {', '.join(fields)} WHERE id::text = ${len(params)}", *params)

    # Update ward available_beds count
    if 'status' in data:
        ward = await db.fetchrow("SELECT * FROM wards WHERE id = $1", existing['ward_id'])
        if ward:
            avail = await db.fetchval("SELECT COUNT(*) FROM beds WHERE ward_id = $1 AND status = 'available' AND is_active = 1", existing['ward_id'])
            await db.execute("UPDATE wards SET available_beds = $1 WHERE id = $2", avail, existing['ward_id'])

    return await get_bed(bed_id, user)


@router.delete('/beds/{bed_id}')
async def delete_bed(bed_id: str, user=Depends(require_admin)):
    await require_db().execute("UPDATE beds SET is_active = 0 WHERE id::text = $1", bed_id)
    return {"detail": "Bed deleted"}
