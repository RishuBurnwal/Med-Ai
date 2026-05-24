import json
from datetime import datetime, timezone

from fastapi import HTTPException

from config import database


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_db():
    if database.pool is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    return database.pool


def row_to_dict(row):
    return dict(row) if row is not None else None


def parse_json_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def patient_row(row):
    item = row_to_dict(row)
    if not item:
        return None
    for key in ("medical_history", "allergies", "current_medications"):
        item[key] = parse_json_list(item.get(key))
    item["id"] = str(item["id"])
    item["is_active"] = bool(item.get("is_active", 1))
    return item
