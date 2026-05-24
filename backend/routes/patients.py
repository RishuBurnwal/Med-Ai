import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal

from routes.auth import get_current_user, require_admin, require_doctor_or_admin
from routes.common import now_iso, patient_row, require_db

router = APIRouter()


class PatientCreate(BaseModel):
    name: str
    age: int = Field(ge=0, le=150)
    gender: Literal["male", "female", "other"]
    blood_group: str
    phone: str
    email: str | None = None
    address: str
    emergency_contact: str
    medical_history: list[str] = []
    allergies: list[str] = []
    current_medications: list[str] = []


class PatientUpdate(BaseModel):
    name: str | None = None
    age: int | None = Field(default=None, ge=0, le=150)
    gender: Literal["male", "female", "other"] | None = None
    blood_group: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    medical_history: list[str] | None = None
    allergies: list[str] | None = None
    current_medications: list[str] | None = None


async def next_patient_id() -> str:
    row = await require_db().fetchrow("SELECT patient_id FROM patients ORDER BY id DESC LIMIT 1")
    if not row:
        return "PAT-0001"
    return f"PAT-{int(row['patient_id'].split('-')[-1]) + 1:04d}"


@router.post("")
async def create_patient(payload: PatientCreate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    created = now_iso()
    temp_patient_id = f"TMP-{uuid4().hex}"
    async with db.transaction():
        row_id = await db.execute(
            """INSERT INTO patients (patient_id,name,age,gender,blood_group,phone,email,address,emergency_contact,medical_history,allergies,current_medications,created_at,updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
            temp_patient_id, payload.name, payload.age, payload.gender, payload.blood_group, payload.phone, payload.email,
            payload.address, payload.emergency_contact, json.dumps(payload.medical_history), json.dumps(payload.allergies),
            json.dumps(payload.current_medications), created, created,
        )
        patient_id = f"PAT-{int(row_id):04d}"
        await db.execute("UPDATE patients SET patient_id = $1 WHERE id = $2", patient_id, row_id)
        row = await db.fetchrow("SELECT * FROM patients WHERE id = $1", row_id)
    return patient_row(row)


@router.get("")
async def list_patients(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), search: str | None = None, user=Depends(get_current_user)):
    db = require_db()
    offset = max(page - 1, 0) * limit
    where = "WHERE is_active = 1"
    params: list = []
    if search:
        where += " AND (LOWER(name) LIKE $1 OR LOWER(patient_id) LIKE $2)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
    limit_param = len(params) + 1
    offset_param = len(params) + 2
    total = await db.fetchval(f"SELECT COUNT(*) FROM patients {where}", *params)
    rows = await db.fetch(f"SELECT * FROM patients {where} ORDER BY id DESC LIMIT ${limit_param} OFFSET ${offset_param}", *params, limit, offset)
    patients = [patient_row(row) for row in rows]
    return {"patients": patients, "items": patients, "total": total, "page": page, "limit": limit}


@router.get("/stats")
async def stats(user=Depends(get_current_user)):
    db = require_db()
    total = await db.fetchval("SELECT COUNT(*) FROM patients WHERE is_active = TRUE")
    today = now_iso()[:10]
    today_registered = await db.fetchval("SELECT COUNT(*) FROM patients WHERE is_active = TRUE AND date(created_at) = date($1)", today)
    rows = await db.fetch("SELECT blood_group, COUNT(*) AS count FROM patients WHERE is_active = TRUE GROUP BY blood_group")
    return {"total": total, "today_registered": today_registered, "by_blood_group": {row["blood_group"]: row["count"] for row in rows}}


@router.get("/{patient_id}")
async def get_patient(patient_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow("SELECT * FROM patients WHERE (id::text = $1 OR patient_id = $1) AND is_active = TRUE", patient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient_row(row)


@router.put("/{patient_id}")
async def update_patient(patient_id: str, payload: PatientUpdate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM patients WHERE (id::text = $1 OR patient_id = $1) AND is_active = TRUE", patient_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return patient_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}" + ("::jsonb" if isinstance(value, list) else ""))
        params.append(json.dumps(value) if isinstance(value, list) else value)
    fields.append(f"updated_at = ${len(params) + 1}")
    params.append(now_iso())
    params.append(patient_id)
    await db.execute(f"UPDATE patients SET {', '.join(fields)} WHERE id::text = ${len(params)} OR patient_id = ${len(params)}", *params)
    return await get_patient(patient_id, user)


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, user=Depends(require_admin)):
    await require_db().execute("UPDATE patients SET is_active = FALSE, updated_at = $1 WHERE id::text = $2 OR patient_id = $2", now_iso(), patient_id)
    return {"detail": "Patient deleted"}


@router.get("/me/profile")
async def get_my_profile(user=Depends(get_current_user)):
    """Get the current patient's profile. Creates one automatically if it doesn't exist."""
    db = require_db()
    email = user["email"]
    name = user["name"]

    # Try to find existing patient by email
    row = await db.fetchrow("SELECT * FROM patients WHERE LOWER(email) = LOWER($1) AND is_active = 1", email)
    if row:
        return patient_row(row)

    # Auto-create a patient record for this user
    import random as rnd
    created = now_iso()
    temp_patient_id = f"TMP-{uuid4().hex[:8]}"
    phone = f"99{rnd.randint(10000000, 99999999)}"
    async with db.transaction():
        row_id = await db.execute(
            """INSERT INTO patients (patient_id,name,age,gender,blood_group,phone,email,address,emergency_contact,medical_history,allergies,current_medications,created_at,updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
            temp_patient_id, name, 30, "male", "O+", phone, email,
            "Please update your address", "Please update emergency contact",
            "[]", "[]", "[]", created, created,
        )
        patient_id = f"PAT-{int(row_id):04d}"
        await db.execute("UPDATE patients SET patient_id = $1 WHERE id = $2", patient_id, row_id)
        row = await db.fetchrow("SELECT * FROM patients WHERE id = $1", row_id)
    print(f"Auto-created patient record {patient_id} for {email}")
    return patient_row(row)
