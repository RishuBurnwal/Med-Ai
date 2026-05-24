from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Literal

from routes.auth import get_current_user, require_admin
from routes.common import now_iso, require_db, row_to_dict

router = APIRouter()


class NotificationCreate(BaseModel):
    user_id: int | None = None
    type: Literal['appointment','billing','lab','prescription','admission','system']
    title: str
    message: str
    reference_type: str | None = None
    reference_id: int | None = None


@router.post('')
async def create_notification(payload: NotificationCreate, user=Depends(require_admin)):
    db = require_db()
    created = now_iso()
    await db.execute(
        """INSERT INTO notifications (user_id,type,title,message,is_read,reference_type,reference_id,created_at)
           VALUES ($1,$2,$3,$4,0,$5,$6,$7)""",
        payload.user_id, payload.type, payload.title, payload.message,
        payload.reference_type, payload.reference_id, created,
    )
    return {"detail": "Notification created"}


@router.get('')
async def list_notifications(
    is_read: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
):
    db = require_db()
    where = "WHERE 1=1"
    params = []
    if is_read is not None:
        params.append(1 if is_read else 0)
        where += f" AND is_read = ${len(params)}"
    rows = await db.fetch(
        f"SELECT * FROM notifications {where} ORDER BY created_at DESC LIMIT $1",
        *params, limit,
    )
    return [dict(row) for row in rows]


@router.get('/unread-count')
async def unread_count(user=Depends(get_current_user)):
    count = await require_db().fetchval("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
    return {"count": count}


@router.post('/{notification_id}/read')
async def mark_read(notification_id: str, user=Depends(get_current_user)):
    await require_db().execute(
        "UPDATE notifications SET is_read = 1 WHERE id::text = $1", notification_id,
    )
    return {"detail": "Marked as read"}


@router.post('/read-all')
async def mark_all_read(user=Depends(get_current_user)):
    await require_db().execute("UPDATE notifications SET is_read = 1 WHERE is_read = 0")
    return {"detail": "All notifications marked as read"}
