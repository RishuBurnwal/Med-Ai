from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Literal

from routes.auth import get_current_user, require_admin, require_doctor_or_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


class LabTestCreate(BaseModel):
    patient_id: str
    test_name: str
    category: str = 'general'
    sample_type: str = 'blood'
    notes: str = ''


class LabTestUpdate(BaseModel):
    sample_collected_at: str | None = None
    result_text: str | None = None
    result_json: dict | None = None
    is_abnormal: bool | None = None
    status: Literal['ordered','collected','processing','completed','cancelled'] | None = None
    performed_by: str | None = None
    notes: str | None = None


def lab_row(row):
    data = row_to_dict(row)
    if not data:
        return None
    data['id'] = str(data['id'])
    return data


@router.post('')
async def create_lab_test(payload: LabTestCreate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    created = now_iso()
    test_id = f"LAB-{uuid4().hex[:8].upper()}"
    row = await db.fetchrow(
        """INSERT INTO lab_tests (test_id,patient_id,doctor_name,test_name,category,sample_type,status,notes,ordered_by,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING *""",
        test_id, payload.patient_id, user['name'], payload.test_name, payload.category,
        payload.sample_type, 'ordered', payload.notes, user['name'], created, created,
    )
    return lab_row(row)


@router.get('')
async def list_lab_tests(
    patient_id: str | None = None,
    status: str | None = None,
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
        where += f" AND l.patient_id = ${len(params)}"
    if status:
        params.append(status)
        where += f" AND l.status = ${len(params)}"
    total = await db.fetchval(f"SELECT COUNT(*) FROM lab_tests l {where}", *params)
    limit_param = len(params) + 1
    offset_param = len(params) + 2
    rows = await db.fetch(
        f"""SELECT l.*, p.name as patient_name FROM lab_tests l
            LEFT JOIN patients p ON l.patient_id = p.patient_id
            {where} ORDER BY l.created_at DESC LIMIT ${limit_param} OFFSET ${offset_param}""",
        *params, limit, offset,
    )
    return {"lab_tests": [lab_row(row) for row in rows], "total": total, "page": page, "limit": limit}


@router.get('/{test_id}')
async def get_lab_test(test_id: str, user=Depends(get_current_user)):
    row = await require_db().fetchrow(
        """SELECT l.*, p.name as patient_name FROM lab_tests l
           LEFT JOIN patients p ON l.patient_id = p.patient_id
           WHERE (l.id::text = $1 OR l.test_id = $1)""",
        test_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Lab test not found")
    return lab_row(row)


@router.put('/{test_id}')
async def update_lab_test(test_id: str, payload: LabTestUpdate, user=Depends(require_doctor_or_admin)):
    db = require_db()
    existing = await db.fetchrow("SELECT * FROM lab_tests WHERE id::text = $1 OR test_id = $1", test_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Lab test not found")
    data = payload.model_dump(exclude_unset=True)
    if 'result_json' in data:
        import json
        data['result_json'] = json.dumps(data['result_json'])
    if not data:
        return lab_row(existing)
    fields = []
    params = []
    for key, value in data.items():
        fields.append(f"{key} = ${len(params) + 1}")
        params.append(value)
    params.append(now_iso())
    params.append(test_id)
    await db.execute(
        f"UPDATE lab_tests SET {', '.join(fields)}, updated_at = ${len(params) - 1} WHERE id::text = ${len(params)} OR test_id = ${len(params)}",
        *params,
    )
    return await get_lab_test(test_id, user)
