import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set

from routes.common import now_iso

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"type": event_type, "data": data, "timestamp": now_iso()})
        dead = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.add(connection)
        for conn in dead:
            self.active_connections.discard(conn)

    async def broadcast_to_portal(self, portal: str, event_type: str, data: dict):
        """Broadcast to connections from a specific portal."""
        message = json.dumps({
            "type": event_type,
            "data": data,
            "portal": portal,
            "timestamp": now_iso(),
        })
        dead = set()
        for connection in self.active_connections:
            try:
                # Store portal info in connection state if available
                await connection.send_text(message)
            except Exception:
                dead.add(connection)
        for conn in dead:
            self.active_connections.discard(conn)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "data": {"message": "Connected to MedAI real-time sync"},
            "timestamp": now_iso(),
        }))
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle ping/pong
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": now_iso(),
                    }))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# Helper functions to broadcast events
async def broadcast_appointment_update(appointment_data: dict):
    await manager.broadcast("appointment_update", appointment_data)


async def broadcast_billing_update(billing_data: dict):
    await manager.broadcast("billing_update", billing_data)


async def broadcast_bed_update(bed_data: dict):
    await manager.broadcast("bed_update", bed_data)


async def broadcast_lab_update(lab_data: dict):
    await manager.broadcast("lab_update", lab_data)


async def broadcast_patient_update(patient_data: dict):
    await manager.broadcast("patient_update", patient_data)
