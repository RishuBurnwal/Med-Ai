import sqlite3
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routes.auth import get_current_user, require_doctor_or_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_name: str
    department: str
    appointment_date: datetime
    reason: str
    appointment_type: Literal["in-person", "teleconsult"]


class StatusUpdate(BaseModel):
    status: Literal["scheduled", "completed", "cancelled"]


class CancelRequest(BaseModel):
    reason: str = ""


def appointment_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data["id"] = str(data["id"])
    return data


@router.post("")
async def create_appointment(payload: AppointmentCreate, user=Depends(require_doctor_or_admin)):
    patient = await require_db().fetchrow(
        "SELECT patient_id FROM patients WHERE patient_id = $1 AND is_active = 1",
        payload.patient_id,
    )
    if not patient:
        raise HTTPException(status_code=400, detail="Patient not found or inactive")
    try:
        row = await require_db().fetchrow(
            """INSERT INTO appointments (patient_id,doctor_name,department,appointment_date,reason,appointment_type,status,created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               RETURNING *""",
            payload.patient_id, payload.doctor_name, payload.department, payload.appointment_date.isoformat(), payload.reason, payload.appointment_type, "scheduled", now_iso(),
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="Unable to create appointment for the selected patient") from exc
    return appointment_row(row)


@router.get("")
async def list_appointments(status: str | None = None, date: str | None = None, doctor: str | None = None, patient_id: str | None = None, limit: int = Query(100, ge=1, le=500), user=Depends(get_current_user)):
    where = "WHERE 1=1"
    params: list = []
    if status:
        params.append(status)
        where += f" AND status = ${len(params)}"
    if date:
        params.append(date)
        where += f" AND date(appointment_date) = date(${len(params)})"
    if doctor:
        params.append(f"%{doctor.lower()}%")
        where += f" AND LOWER(doctor_name) LIKE ${len(params)}"
    if patient_id:
        params.append(patient_id)
        where += f" AND patient_id = ${len(params)}"
    params.append(limit)
    rows = await require_db().fetch(f"SELECT * FROM appointments {where} ORDER BY appointment_date DESC LIMIT ${len(params)}", *params)
    appointments = [appointment_row(row) for row in rows]
    return {"appointments": appointments, "items": appointments, "total": len(appointments)}


@router.get("/today")
async def today(user=Depends(get_current_user)):
    date = now_iso()[:10]
    rows = await require_db().fetch("SELECT * FROM appointments WHERE date(appointment_date) = date($1) ORDER BY appointment_date", date)
    return [appointment_row(row) for row in rows]


@router.get("/stats")
async def stats(user=Depends(get_current_user)):
    db = require_db()
    rows = await db.fetch("SELECT status, COUNT(*) AS count FROM appointments GROUP BY status")
    result = {"scheduled": 0, "completed": 0, "cancelled": 0}
    for row in rows:
        result[row["status"]] = row["count"]
    result["total"] = sum(result.values())
    result["today"] = await db.fetchval("SELECT COUNT(*) FROM appointments WHERE date(appointment_date) = date($1)", now_iso()[:10])
    return result


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow("SELECT * FROM appointments WHERE id::text = $1", appointment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment_row(row)


@router.put("/{appointment_id}/status")
async def update_status(appointment_id: str, payload: StatusUpdate, user=Depends(require_doctor_or_admin)):
    await require_db().execute("UPDATE appointments SET status = $1 WHERE id::text = $2", payload.status, appointment_id)
    return await get_appointment(appointment_id, user)


@router.put("/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, payload: CancelRequest = CancelRequest(), user=Depends(get_current_user)):
    db = require_db()
    row = await db.fetchrow("SELECT * FROM appointments WHERE id::text = $1", appointment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if row["status"] in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {row['status']} appointment")
    # Patients can only cancel their own appointments
    if user["role"] == "patient":
        patient = await db.fetchrow(
            "SELECT patient_id FROM patients WHERE email = $1 AND is_active = 1", user["email"]
        )
        if not patient or patient["patient_id"] != row["patient_id"]:
            raise HTTPException(status_code=403, detail="You can only cancel your own appointments")
    now = now_iso()
    await db.execute(
        "UPDATE appointments SET status = 'cancelled', cancellation_reason = $1, cancelled_at = $2 WHERE id::text = $3",
        payload.reason, now, appointment_id,
    )
    return await get_appointment(appointment_id, user)
