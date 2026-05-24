from datetime import datetime, timedelta, timezone
import random

from fastapi import APIRouter, Depends

from routes.auth import get_current_user
from routes.common import require_db

router = APIRouter()


@router.get("/overview")
async def overview(user=Depends(get_current_user)):
    db = require_db()
    total_patients = await db.fetchval("SELECT COUNT(*) FROM patients WHERE is_active = TRUE")
    total_appointments = await db.fetchval("SELECT COUNT(*) FROM appointments")
    today = datetime.now(timezone.utc).date().isoformat()
    today_appointments = await db.fetchval("SELECT COUNT(*) FROM appointments WHERE date(appointment_date) = date($1)", today)
    rows = await db.fetch("SELECT status, COUNT(*) AS count FROM appointments GROUP BY status")
    status_counts = {row["status"]: row["count"] for row in rows}
    return {
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "appointments_this_week": total_appointments,
        "appointments_this_month": total_appointments,
        "scheduled": status_counts.get("scheduled", 0),
        "completed": status_counts.get("completed", 0),
        "cancelled": status_counts.get("cancelled", 0),
        "patient_growth_percentage": 12,
        "bed_occupancy_rate": random.randint(60, 85),
    }


@router.get("/appointments-chart")
async def appointments_chart(days: int = 7, user=Depends(get_current_user)):
    db = require_db()
    start = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    rows = await db.fetch("SELECT date(appointment_date) AS day, COUNT(*) AS count FROM appointments WHERE date(appointment_date) >= date($1) GROUP BY day", start.isoformat())
    counts = {row["day"]: row["count"] for row in rows}
    return [{"date": (start + timedelta(days=i)).strftime("%a"), "count": counts.get((start + timedelta(days=i)).isoformat(), 0)} for i in range(days)]


@router.get("/patients-by-blood-group")
async def patients_by_blood(user=Depends(get_current_user)):
    rows = await require_db().fetch("SELECT blood_group, COUNT(*) AS count FROM patients WHERE is_active = TRUE GROUP BY blood_group")
    return [{"blood_group": row["blood_group"], "count": row["count"]} for row in rows]


@router.get("/patients-by-gender")
async def patients_by_gender(user=Depends(get_current_user)):
    rows = await require_db().fetch("SELECT gender, COUNT(*) AS count FROM patients WHERE is_active = TRUE GROUP BY gender")
    return {row["gender"]: row["count"] for row in rows}


@router.get("/departments")
async def departments(user=Depends(get_current_user)):
    rows = await require_db().fetch("SELECT department, COUNT(*) AS count FROM appointments GROUP BY department ORDER BY count DESC LIMIT 5")
    return [{"department": row["department"], "count": row["count"]} for row in rows]


@router.get("/doctor-stats")
async def doctor_stats(user=Depends(get_current_user)):
    """Get stats specific to the current doctor user."""
    db = require_db()
    
    # Check if user is a doctor
    if user["role"] != "doctor":
        return {
            "total_appointments": 0,
            "today_appointments": 0,
            "completed": 0,
            "pending": 0,
            "total_patients": 0,
            "recent_patients": [],
            "upcoming_appointments": [],
        }
    
    doctor_name = user["name"]
    today = datetime.now(timezone.utc).date().isoformat()
    
    total_appointments = await db.fetchval(
        "SELECT COUNT(*) FROM appointments WHERE doctor_name = $1", doctor_name
    )
    today_appointments = await db.fetchval(
        "SELECT COUNT(*) FROM appointments WHERE doctor_name = $1 AND date(appointment_date) = date($2)",
        doctor_name, today,
    )
    completed = await db.fetchval(
        "SELECT COUNT(*) FROM appointments WHERE doctor_name = $1 AND status = 'completed'", doctor_name
    )
    pending = await db.fetchval(
        "SELECT COUNT(*) FROM appointments WHERE doctor_name = $1 AND status IN ('scheduled','confirmed')", doctor_name
    )
    total_patients = await db.fetchval(
        "SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE doctor_name = $1", doctor_name
    )
    
    recent_patients_rows = await db.fetch(
        """SELECT DISTINCT a.patient_id, p.name, p.blood_group, p.gender, p.age
           FROM appointments a
           JOIN patients p ON p.patient_id = a.patient_id
           WHERE a.doctor_name = $1
           ORDER BY a.created_at DESC LIMIT 5""",
        doctor_name,
    )
    
    upcoming_rows = await db.fetch(
        """SELECT * FROM appointments
           WHERE doctor_name = $1 AND status IN ('scheduled','confirmed')
           ORDER BY appointment_date ASC LIMIT 10""",
        doctor_name,
    )
    
    return {
        "total_appointments": total_appointments or 0,
        "today_appointments": today_appointments or 0,
        "completed": completed or 0,
        "pending": pending or 0,
        "total_patients": total_patients or 0,
        "recent_patients": [dict(r) for r in recent_patients_rows],
        "upcoming_appointments": [dict(r) for r in upcoming_rows],
    }
