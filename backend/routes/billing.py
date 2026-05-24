from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal

from routes.auth import get_current_user, require_admin, require_doctor_or_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


class BillingCreate(BaseModel):
    patient_id: str
    appointment_id: int | None = None
    bill_type: Literal['consultation','admission','lab_test','procedure','pharmacy','emergency','other'] = 'consultation'
    description: str = ''
    amount: float = 0
    discount: float = 0
    tax: float = 0
    payment_method: Literal['cash','card','insurance','upi','online'] | None = None
    due_date: str | None = None
    notes: str = ''


class BillingUpdate(BaseModel):
    description: str | None = None
    amount: float | None = None
    discount: float | None = None
    tax: float | None = None
    payment_status: Literal['pending','paid','partial','cancelled','refunded'] | None = None
    payment_method: Literal['cash','card','insurance','upi','online'] | None = None
    paid_amount: float | None = None
    due_date: str | None = None
    notes: str | None = None


def billing_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    data['total_amount'] = float(data['total_amount'])
    data['amount'] = float(data['amount'])
    data['discount'] = float(data['discount'])
    data['tax'] = float(data['tax'])
    data['paid_amount'] = float(data['paid_amount'] or 0)
    return data


@router.post('')
async def create_bill(payload: BillingCreate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    created = now_iso()
    invoice = f"INV-{uuid4().hex[:8].upper()}"
    total = payload.amount - payload.discount + payload.tax
    if total < 0:
        raise HTTPException(status_code=400, detail="Total amount cannot be negative")

    row = await db.fetchrow(
        """INSERT INTO billing (invoice_number,patient_id,appointment_id,bill_type,description,amount,discount,tax,total_amount,payment_status,payment_method,paid_amount,billing_date,due_date,notes,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           RETURNING *""",
        invoice, payload.patient_id, payload.appointment_id, payload.bill_type, payload.description,
        payload.amount, payload.discount, payload.tax, total, 'pending' if not payload.paid_amount else 'partial',
        payload.payment_method, payload.paid_amount or 0, created, payload.due_date, payload.notes, created,
    )
    return billing_row(row)


@router.get('')
async def list_bills(
    patient_id: str | None = None,
    payment_status: str | None = None,
    bill_type: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
):
    db = require_db()
    offset = max(page - 1, 0) * limit
    where = "WHERE 1=1"
    params = []
    if patient_id:
        params.append(patient_id)
        where += f" AND b.patient_id = ${len(params)}"
    if payment_status:
        params.append(payment_status)
        where += f" AND b.payment_status = ${len(params)}"
    if bill_type:
        params.append(bill_type)
        where += f" AND b.bill_type = ${len(params)}"

    total = await db.fetchval(f"SELECT COUNT(*) FROM billing b {where}", *params)
    limit_param = len(params) + 1
    offset_param = len(params) + 2
    rows = await db.fetch(
        f"""SELECT b.*, p.name as patient_name FROM billing b
            LEFT JOIN patients p ON b.patient_id = p.patient_id
            {where} ORDER BY b.created_at DESC LIMIT ${limit_param} OFFSET ${offset_param}""",
        *params, limit, offset,
    )
    return {"bills": [billing_row(row) for row in rows], "total": total, "page": page, "limit": limit}


@router.get('/stats')
async def billing_stats(user=Depends(get_current_user)):
    db = require_db()
    total_revenue = await db.fetchval("SELECT COALESCE(SUM(paid_amount), 0) FROM billing WHERE payment_status IN ('paid','partial')") or 0
    total_pending = await db.fetchval("SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM billing WHERE payment_status IN ('pending','partial')") or 0
    pending_count = await db.fetchval("SELECT COUNT(*) FROM billing WHERE payment_status = 'pending'")
    paid_count = await db.fetchval("SELECT COUNT(*) FROM billing WHERE payment_status = 'paid'")
    total_bills = await db.fetchval("SELECT COUNT(*) FROM billing")
    by_type = await db.fetch("SELECT bill_type, COUNT(*) as count, COALESCE(SUM(paid_amount),0) as revenue FROM billing GROUP BY bill_type")
    return {
        "total_revenue": float(total_revenue),
        "total_pending": float(total_pending),
        "pending_count": pending_count,
        "paid_count": paid_count,
        "total_bills": total_bills,
        "by_type": [dict(row) for row in by_type],
    }


@router.get('/{bill_id}')
async def get_bill(bill_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow(
        """SELECT b.*, p.name as patient_name FROM billing b
           LEFT JOIN patients p ON b.patient_id = p.patient_id
           WHERE (b.id::text = $1 OR b.invoice_number = $1)""",
        bill_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bill not found")
    return billing_row(row)


@router.put('/{bill_id}')
async def update_bill(bill_id: str, payload: BillingUpdate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM billing WHERE id::text = $1 OR invoice_number = $1", bill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Bill not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return billing_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    params.append(bill_id)
    await db.execute(
        f"UPDATE billing SET {', '.join(fields)} WHERE id::text = ${len(params)} OR invoice_number = ${len(params)}",
        *params,
    )
    return await get_bill(bill_id, user)


@router.post('/{bill_id}/payment')
async def record_payment(
    bill_id: str,
    amount: float,
    payment_method: Literal['cash','card','insurance','upi','online'],
    user=Depends(require_admin),
):
    db = require_db()
    bill = await db.fetchrow("SELECT * FROM billing WHERE id::text = $1 OR invoice_number = $1", bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill['payment_status'] == 'paid':
        raise HTTPException(status_code=400, detail="Bill is already fully paid")
    paid_so_far = float(bill['paid_amount'] or 0)
    new_paid = paid_so_far + amount
    total = float(bill['total_amount'])
    status = 'paid' if new_paid >= total else 'partial'
    await db.execute(
        "UPDATE billing SET paid_amount = $1, payment_status = $2, payment_method = $3 WHERE id = $4",
        new_paid, status, payment_method, bill['id'],
    )
    return await get_bill(str(bill['id']), user)
