import io
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal

from routes.auth import get_current_user, require_doctor_or_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


class MedicationItem(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    route: str = 'oral'
    instructions: str = ''


class PrescriptionCreate(BaseModel):
    patient_id: str
    diagnosis: str = ''
    notes: str = ''
    medications: list[MedicationItem] = []


class PrescriptionUpdate(BaseModel):
    diagnosis: str | None = None
    notes: str | None = None
    medications: list[MedicationItem] | None = None


def prescription_row(row, medications=None):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    if medications is not None:
        data['medications'] = medications
    return data


def medication_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    data['prescription_id'] = str(data['prescription_id'])
    return data


@router.post('')
async def create_prescription(payload: PrescriptionCreate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    created = now_iso()
    presc_id = f"PRESC-{uuid4().hex[:8].upper()}"

    async with db.transaction():
        row = await db.fetchrow(
            """INSERT INTO prescriptions (prescription_id,patient_id,doctor_name,diagnosis,notes,is_active,created_at)
               VALUES ($1,$2,$3,$4,$5,1,$6) RETURNING *""",
            presc_id, payload.patient_id, user['name'], payload.diagnosis, payload.notes, created,
        )
        for med in payload.medications:
            await db.execute(
                """INSERT INTO prescription_medications (prescription_id,medication_name,dosage,frequency,duration,route,instructions)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                row['id'], med.medication_name, med.dosage, med.frequency, med.duration, med.route, med.instructions,
            )
        med_rows = await db.fetch(
            "SELECT * FROM prescription_medications WHERE prescription_id = $1", row['id'],
        )
    return prescription_row(row, [medication_row(m) for m in med_rows])


@router.get('')
async def list_prescriptions(
    patient_id: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
):
    db = require_db()
    offset = max(page - 1, 0) * limit
    where = "WHERE p.is_active = 1"
    params = []
    if patient_id:
        params.append(patient_id)
        where += f" AND p.patient_id = ${len(params)}"
    total = await db.fetchval(f"SELECT COUNT(*) FROM prescriptions p {where}", *params)
    limit_param = len(params) + 1
    offset_param = len(params) + 2
    rows = await db.fetch(
        f"""SELECT p.*, pt.name as patient_name FROM prescriptions p
            LEFT JOIN patients pt ON p.patient_id = pt.patient_id
            {where} ORDER BY p.created_at DESC LIMIT ${limit_param} OFFSET ${offset_param}""",
        *params, limit, offset,
    )
    results = []
    for row in rows:
        meds = await db.fetch("SELECT * FROM prescription_medications WHERE prescription_id = $1", row['id'])
        results.append(prescription_row(row, [medication_row(m) for m in meds]))
    return {"prescriptions": results, "total": total, "page": page, "limit": limit}


@router.get('/{presc_id}')
async def get_prescription(presc_id: str, user=Depends(get_current_user)):
    db = require_db()
    row = await db.fetchrow(
        """SELECT p.*, pt.name as patient_name FROM prescriptions p
           LEFT JOIN patients pt ON p.patient_id = pt.patient_id
           WHERE (p.id::text = $1 OR p.prescription_id = $1) AND p.is_active = 1""",
        presc_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")
    meds = await db.fetch("SELECT * FROM prescription_medications WHERE prescription_id = $1", row['id'])
    return prescription_row(row, [medication_row(m) for m in meds])


@router.get('/{presc_id}/pdf')
async def prescription_pdf(presc_id: str, user=Depends(get_current_user)):
    db = require_db()
    row = await db.fetchrow(
        """SELECT p.*, pt.name as patient_name, pt.age, pt.gender, pt.blood_group
           FROM prescriptions p
           LEFT JOIN patients pt ON p.patient_id = pt.patient_id
           WHERE (p.id::text = $1 OR p.prescription_id = $1) AND p.is_active = 1""",
        presc_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Patients can only download their own prescriptions
    if user['role'] == 'patient':
        patient = await db.fetchrow(
            "SELECT patient_id FROM patients WHERE email = $1 AND is_active = 1", user['email']
        )
        if not patient or patient['patient_id'] != row['patient_id']:
            raise HTTPException(status_code=403, detail="Access denied")

    meds = await db.fetch("SELECT * FROM prescription_medications WHERE prescription_id = $1", row['id'])
    data = row_to_dict(row)

    # Generate PDF
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Header
    pdf.set_font('Helvetica', 'B', 20)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 12, 'MedAI Hospital', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, 'Intelligent Hospital Ecosystem', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.line(10, pdf.get_y() + 2, 200, pdf.get_y() + 2)
    pdf.ln(6)

    # Title
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, 'MEDICAL PRESCRIPTION', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.ln(2)

    # Prescription ID and Date
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 5, f"Rx #: {data.get('prescription_id', '')}", new_x='LMARGIN', new_y='NEXT')
    from datetime import datetime
    created = data.get('created_at', '')
    if created:
        try:
            dt = datetime.fromisoformat(created)
            created = dt.strftime('%B %d, %Y')
        except:
            pass
    pdf.cell(0, 5, f"Date: {created}", new_x='LMARGIN', new_y='NEXT')
    pdf.ln(4)

    # Doctor & Patient info
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(95, 6, 'DOCTOR', new_x='RIGHT', new_y='LAST')
    pdf.cell(95, 6, 'PATIENT', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(95, 5, f"Dr. {data.get('doctor_name', '')}", new_x='RIGHT', new_y='LAST')
    pdf.cell(95, 5, data.get('patient_name', data.get('patient_id', '')), new_x='LMARGIN', new_y='NEXT')
    pdf.cell(95, 5, '', new_x='RIGHT', new_y='LAST')
    age = data.get('age', '')
    gender = data.get('gender', '')
    patient_info = f"Age: {age}" if age else ''
    if gender:
        patient_info += f"  |  {gender.capitalize()}" if patient_info else f"Gender: {gender.capitalize()}"
    bg = data.get('blood_group', '')
    if bg:
        patient_info += f"  |  {bg}" if patient_info else f"Blood: {bg}"
    pdf.cell(95, 5, patient_info, new_x='LMARGIN', new_y='NEXT')
    pdf.ln(4)

    # Diagnosis
    diagnosis = data.get('diagnosis', '')
    if diagnosis:
        pdf.set_fill_color(240, 253, 244)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(6, 78, 59)
        pdf.cell(0, 7, 'DIAGNOSIS', new_x='LMARGIN', new_y='NEXT', fill=True)
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(40, 40, 40)
        pdf.multi_cell(0, 5, diagnosis)
        pdf.ln(3)

    # Medications table
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_text_color(6, 78, 59)
    pdf.set_fill_color(240, 253, 244)
    pdf.cell(0, 7, 'MEDICATIONS', new_x='LMARGIN', new_y='NEXT', fill=True)
    pdf.ln(2)

    # Table header
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    col_w = [52, 28, 32, 22, 22, 34]
    headers = ['Medication', 'Dosage', 'Frequency', 'Duration', 'Route', 'Instructions']
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 6, h, border=1, fill=True, align='C')
    pdf.ln()

    # Table rows
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(40, 40, 40)
    fill = False
    for m in meds:
        med = row_to_dict(m)
        if fill:
            pdf.set_fill_color(245, 245, 245)
        else:
            pdf.set_fill_color(255, 255, 255)
        row_data = [
            med.get('medication_name', ''),
            med.get('dosage', ''),
            med.get('frequency', ''),
            med.get('duration', ''),
            med.get('route', 'oral').capitalize(),
            med.get('instructions', ''),
        ]
        # Calculate row height
        max_lines = 1
        for i, val in enumerate(row_data):
            lines = pdf.multi_cell(col_w[i], 4, val, dry_run=True, output='LINES')
            max_lines = max(max_lines, len(lines))
        row_h = max(6, max_lines * 4)

        y_start = pdf.get_y()
        x_start = pdf.get_x()
        for i, val in enumerate(row_data):
            pdf.set_xy(x_start + sum(col_w[:i]), y_start)
            pdf.multi_cell(col_w[i], 4, val, border=1, fill=fill)
        pdf.set_y(max(pdf.get_y(), y_start + row_h))
        fill = not fill

    pdf.ln(4)

    # Notes
    notes = data.get('notes', '')
    if notes:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(6, 78, 59)
        pdf.set_fill_color(240, 253, 244)
        pdf.cell(0, 7, 'NOTES', new_x='LMARGIN', new_y='NEXT', fill=True)
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(0, 5, notes)
        pdf.ln(3)

    # Footer disclaimer
    pdf.ln(8)
    pdf.set_font('Helvetica', 'I', 7)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 4, 'This is a computer-generated prescription. It requires the doctor signature and hospital stamp to be valid.', new_x='LMARGIN', new_y='NEXT', align='C')
    pdf.cell(0, 4, 'Generated by MedAI Hospital System', new_x='LMARGIN', new_y='NEXT', align='C')

    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)

    filename = f"prescription_{data.get('prescription_id', presc_id)}.pdf"
    return StreamingResponse(
        buf,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.put('/{presc_id}')
async def update_prescription(presc_id: str, payload: PrescriptionUpdate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM prescriptions WHERE id::text = $1 AND is_active = 1", presc_id)
    if not existing:
        existing = await db.fetchrow("SELECT * FROM prescriptions WHERE prescription_id = $1 AND is_active = 1", presc_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Prescription not found")
    data = payload.model_dump(exclude_unset=True)
    medications = data.pop('medications', None)
    if data:
        fields = []
        params = []
        for key, value in data.items():
            fields.append(f"{key} = ${len(params) + 1}")
            params.append(value)
        params.append(existing['id'])
        await db.execute(
            f"UPDATE prescriptions SET {', '.join(fields)} WHERE id = ${len(params)}",
            *params,
        )
    if medications is not None:
        await db.execute("DELETE FROM prescription_medications WHERE prescription_id = $1", existing['id'])
        for med in medications:
            await db.execute(
                """INSERT INTO prescription_medications (prescription_id,medication_name,dosage,frequency,duration,route,instructions)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                existing['id'], med.medication_name, med.dosage, med.frequency, med.duration, med.route, med.instructions,
            )
    return await get_prescription(str(existing['id']), user)
