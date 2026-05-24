from importlib import util
from pathlib import Path
import atexit
import os
import re
import socket
import subprocess
import sys
import time


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
PATIENT_PORTAL_DIR = FRONTEND_DIR / "patient-portal"
VENV_PYTHON = BACKEND_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
HOST = "0.0.0.0"
BACKEND_PORT = 8000
ADMIN_PORT = 5173
PATIENT_PORT = 5174

if __name__ == "__main__" and VENV_PYTHON.exists() and Path(sys.executable).resolve() != VENV_PYTHON.resolve():
    completed = subprocess.run([str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]], check=False)
    raise SystemExit(completed.returncode)

import uvicorn
from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

backend_spec = util.spec_from_file_location("backend_main", BACKEND_DIR / "main.py")
if backend_spec is None or backend_spec.loader is None:
    raise RuntimeError("Unable to load backend entrypoint")
backend_module = util.module_from_spec(backend_spec)
backend_spec.loader.exec_module(backend_module)


app = backend_module.app


def _port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        try:
            sock.bind(("", port))
            return False
        except OSError:
            return True


def _port_accepts_connection(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def _pids_using_port_windows(port: int) -> set[int]:
    result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, check=False)
    pids: set[int] = set()
    pattern = re.compile(rf"^\s*TCP\s+\S+:{port}\s+\S+\s+LISTENING\s+(\d+)\s*$", re.IGNORECASE)
    for line in result.stdout.splitlines():
        match = pattern.match(line)
        if match:
            pids.add(int(match.group(1)))
    return pids


def _pids_using_port_unix(port: int) -> set[int]:
    result = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True, check=False)
    return {int(pid) for pid in result.stdout.split() if pid.isdigit()}


def _pids_using_port(port: int) -> set[int]:
    if os.name == "nt":
        return _pids_using_port_windows(port)
    return _pids_using_port_unix(port)


def _stop_process(pid: int) -> None:
    if pid == os.getpid():
        raise RuntimeError("Refusing to stop the current process")
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], check=False)
    else:
        os.kill(pid, 15)


def _ensure_port_available(port: int, label: str) -> None:
    if not _port_is_open(port):
        return

    pids = sorted(pid for pid in _pids_using_port(port) if pid != os.getpid())
    pid_text = ", ".join(str(pid) for pid in pids) if pids else "unknown"
    answer = input(f"{label} port {port} is already in use by PID(s): {pid_text}. Close it and restart? (yes/no): ").strip().lower()
    if answer not in {"y", "yes"}:
        print(f"{label} port {port} is busy. Project startup cancelled.")
        raise SystemExit(1)

    if not pids:
        print(f"Could not identify the process using port {port}. Please close it manually.")
        raise SystemExit(1)

    for pid in pids:
        print(f"Stopping PID {pid} on port {port}...")
        _stop_process(pid)

    deadline = time.monotonic() + 10
    while _port_is_open(port) and time.monotonic() < deadline:
        time.sleep(0.25)

    if _port_is_open(port):
        print(f"Port {port} is still busy after stopping PID(s): {pid_text}.")
        raise SystemExit(1)


def _wait_for_port(port: int, label: str, timeout_seconds: int = 60) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if _port_accepts_connection(port):
            return
        time.sleep(0.5)
    raise RuntimeError(f"{label} did not start on port {port} within {timeout_seconds} seconds")


def _start_frontend(cwd: Path, port: int) -> subprocess.Popen:
    npm_command = "npm.cmd" if os.name == "nt" else "npm"
    process = subprocess.Popen(
        [npm_command, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port)],
        cwd=cwd,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )

    def cleanup() -> None:
        if process.poll() is not None:
            return
        print(f"\nStopping frontend dev server on port {port}...")
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            process.terminate()

    atexit.register(cleanup)
    return process


if __name__ == "__main__":
    _ensure_port_available(BACKEND_PORT, "Backend")
    _ensure_port_available(ADMIN_PORT, "Admin Portal")
    _ensure_port_available(PATIENT_PORT, "Patient Portal")

    admin_process = _start_frontend(FRONTEND_DIR, ADMIN_PORT)
    patient_process = _start_frontend(PATIENT_PORTAL_DIR, PATIENT_PORT)

    try:
        _wait_for_port(ADMIN_PORT, "Admin Portal")
    except Exception:
        if admin_process.poll() is not None:
            raise RuntimeError("Admin frontend dev server exited before it became ready")
        raise

    try:
        _wait_for_port(PATIENT_PORT, "Patient Portal")
    except Exception:
        if patient_process.poll() is not None:
            raise RuntimeError("Patient frontend dev server exited before it became ready")
        raise

    print("\n🚀 MedAI is starting...")
    print(f"┌──────────────────────────────────────────────┐")
    print(f"│  📋 Admin Portal  → http://127.0.0.1:{ADMIN_PORT}    │")
    print(f"│  🧑 Patient Portal → http://127.0.0.1:{PATIENT_PORT}    │")
    print(f"│  ⚙️  Backend API   → http://127.0.0.1:{BACKEND_PORT}    │")
    print(f"│  📖 API Docs       → http://127.0.0.1:{BACKEND_PORT}/docs │")
    print(f"│  🔌 WebSocket      → ws://127.0.0.1:{BACKEND_PORT}/ws   │")
    print(f"└──────────────────────────────────────────────┘\n")

    uvicorn.run(app, host=HOST, port=BACKEND_PORT)
