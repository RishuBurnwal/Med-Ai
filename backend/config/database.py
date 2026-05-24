import asyncio
import contextvars
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import aiosqlite
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hospital_ai.db")
BACKEND_NAME = "sqlite"

pool: Optional["SQLiteDatabase"] = None


def _resolve_sqlite_path(database_url: str) -> str:
    if database_url.startswith("sqlite:///"):
        raw_path = database_url[len("sqlite:///") :]
    elif database_url.startswith("sqlite://"):
        raw_path = database_url[len("sqlite://") :]
    else:
        raw_path = database_url

    if raw_path in {":memory:", "/:memory:", "memory"}:
        return ":memory:"

    path = Path(raw_path)
    if not path.is_absolute():
        path = (PROJECT_ROOT / path).resolve()
    return str(path)


def _translate_query(query: str) -> str:
    translated = query
    # Handle both simple (col::type) and qualified (table.col::type) references
    translated = re.sub(r"((?:\w+\.)?\w+)::date\s*AS\s*(\b\w+\b)", r"date(\1) AS \2", translated, flags=re.IGNORECASE)
    translated = re.sub(r"((?:\w+\.)?\w+)::text", r"CAST(\1 AS TEXT)", translated, flags=re.IGNORECASE)
    translated = translated.replace("::jsonb", "")
    translated = re.sub(r"\$(\d+)", r"?\1", translated)
    return translated


class SQLiteDatabase:
    def __init__(self, connection: aiosqlite.Connection):
        self._connection = connection
        self._lock = asyncio.Lock()
        self._transaction_depth = contextvars.ContextVar("sqlite_transaction_depth", default=0)

    @property
    def raw_connection(self) -> aiosqlite.Connection:
        return self._connection

    async def execute(self, query: str, *params):
        if self._transaction_depth.get() > 0:
            return await self._execute_unlocked(query, *params)

        async with self._lock:
            result = await self._execute_unlocked(query, *params)
            await self._connection.commit()
            return result

    async def _execute_unlocked(self, query: str, *params):
        cursor = await self._connection.execute(_translate_query(query), params)
        try:
            return cursor.lastrowid
        finally:
            await cursor.close()

    async def fetch(self, query: str, *params):
        if self._transaction_depth.get() > 0:
            return await self._fetch_unlocked(query, *params)

        async with self._lock:
            return await self._fetch_unlocked(query, *params)

    async def _fetch_unlocked(self, query: str, *params):
        cursor = await self._connection.execute(_translate_query(query), params)
        try:
            return await cursor.fetchall()
        finally:
            await cursor.close()

    async def fetchrow(self, query: str, *params):
        if self._transaction_depth.get() > 0:
            return await self._fetchrow_unlocked(query, *params)

        async with self._lock:
            return await self._fetchrow_unlocked(query, *params)

    async def _fetchrow_unlocked(self, query: str, *params):
        cursor = await self._connection.execute(_translate_query(query), params)
        try:
            return await cursor.fetchone()
        finally:
            await cursor.close()

    async def fetchval(self, query: str, *params):
        row = await self.fetchrow(query, *params)
        if row is None:
            return None
        return row[0]

    @asynccontextmanager
    async def transaction(self):
        depth = self._transaction_depth.get()
        if depth == 0:
            await self._lock.acquire()

        next_depth = depth + 1
        token = self._transaction_depth.set(next_depth)
        savepoint_name = f"sp_{next_depth}"
        if next_depth == 1:
            await self._connection.execute("BEGIN")
        else:
            await self._connection.execute(f"SAVEPOINT {savepoint_name}")
        try:
            yield self
        except Exception:
            if next_depth == 1:
                await self._connection.rollback()
            else:
                await self._connection.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
                await self._connection.execute(f"RELEASE SAVEPOINT {savepoint_name}")
            raise
        else:
            if next_depth == 1:
                await self._connection.commit()
            else:
                await self._connection.execute(f"RELEASE SAVEPOINT {savepoint_name}")
        finally:
            self._transaction_depth.reset(token)
            if depth == 0:
                self._lock.release()

    async def close(self) -> None:
        await self._connection.close()


async def connect_to_postgres() -> None:
    global pool

    try:
        connection = await aiosqlite.connect(_resolve_sqlite_path(DATABASE_URL), isolation_level=None)
        connection.row_factory = aiosqlite.Row
        await connection.execute("PRAGMA foreign_keys = ON")
        await connection.execute("PRAGMA journal_mode = WAL")
        await connection.execute("PRAGMA busy_timeout = 5000")
        await initialize_schema(connection)
        await connection.execute("SELECT 1")
        await connection.commit()
        pool = SQLiteDatabase(connection)
        print("SQLite connected")
    except Exception as exc:
        print(f"SQLite connection failed: {exc}")
        raise RuntimeError("SQLite connection failed") from exc


async def close_postgres_connection() -> None:
    global pool

    if pool is not None:
        await pool.close()
        pool = None


def require_pool() -> SQLiteDatabase:
    if pool is None:
        raise RuntimeError("SQLite database is not initialized")
    return pool


async def initialize_schema(connection: aiosqlite.Connection) -> None:
    await connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            role TEXT NOT NULL CHECK(role IN ('admin','doctor','patient','staff')),
            hashed_password TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_password_change TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            age INTEGER NOT NULL CHECK(age BETWEEN 0 AND 150),
            gender TEXT NOT NULL CHECK(gender IN ('male','female','other')),
            blood_group TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            emergency_contact TEXT NOT NULL,
            medical_history TEXT NOT NULL DEFAULT '[]',
            allergies TEXT NOT NULL DEFAULT '[]',
            current_medications TEXT NOT NULL DEFAULT '[]',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            doctor_name TEXT NOT NULL,
            department TEXT NOT NULL,
            appointment_date TEXT NOT NULL,
            reason TEXT NOT NULL,
            appointment_type TEXT NOT NULL CHECK(appointment_type IN ('in-person','teleconsult')),
            status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','completed','cancelled')),
            cancellation_reason TEXT DEFAULT '',
            cancelled_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patient_id) REFERENCES patients(patient_id)
        );

        CREATE TABLE IF NOT EXISTS report_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            filename TEXT NOT NULL,
            analysis_type TEXT NOT NULL,
            analysis TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            head_doctor TEXT,
            location TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id TEXT NOT NULL UNIQUE,
            user_id INTEGER REFERENCES users(id),
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            phone TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('doctor','nurse','receptionist','pharmacist','lab_technician','admin','accountant')),
            specialization TEXT NOT NULL DEFAULT '',
            department_id INTEGER REFERENCES departments(id),
            qualification TEXT NOT NULL DEFAULT '',
            experience_years INTEGER DEFAULT 0,
            salary REAL DEFAULT 0,
            joining_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ward_number TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            floor INTEGER NOT NULL DEFAULT 1,
            department_id INTEGER REFERENCES departments(id),
            total_beds INTEGER NOT NULL DEFAULT 10,
            available_beds INTEGER NOT NULL DEFAULT 10,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS beds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bed_number TEXT NOT NULL UNIQUE,
            ward_id INTEGER REFERENCES wards(id),
            room_number TEXT NOT NULL,
            bed_type TEXT NOT NULL CHECK(bed_type IN ('general','semi_private','private','icu','nicu','emergency')) DEFAULT 'general',
            status TEXT NOT NULL CHECK(status IN ('available','occupied','maintenance','reserved')) DEFAULT 'available',
            current_patient_id TEXT REFERENCES patients(patient_id),
            assigned_doctor TEXT,
            admission_date TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS billing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            patient_id TEXT NOT NULL REFERENCES patients(patient_id),
            appointment_id INTEGER REFERENCES appointments(id),
            bill_type TEXT NOT NULL CHECK(bill_type IN ('consultation','admission','lab_test','procedure','pharmacy','emergency','other')) DEFAULT 'consultation',
            description TEXT NOT NULL DEFAULT '',
            amount REAL NOT NULL DEFAULT 0,
            discount REAL NOT NULL DEFAULT 0,
            tax REAL NOT NULL DEFAULT 0,
            total_amount REAL NOT NULL DEFAULT 0,
            payment_status TEXT NOT NULL CHECK(payment_status IN ('pending','paid','partial','cancelled','refunded')) DEFAULT 'pending',
            payment_method TEXT CHECK(payment_method IN ('cash','card','insurance','upi','online')) ,
            paid_amount REAL DEFAULT 0,
            billing_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            due_date TEXT,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS lab_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id TEXT NOT NULL UNIQUE,
            patient_id TEXT NOT NULL REFERENCES patients(patient_id),
            doctor_name TEXT NOT NULL,
            test_name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'general',
            sample_type TEXT NOT NULL DEFAULT 'blood',
            sample_collected_at TEXT,
            result_text TEXT DEFAULT '',
            result_json TEXT DEFAULT '{}',
            is_abnormal INTEGER DEFAULT 0,
            status TEXT NOT NULL CHECK(status IN ('ordered','collected','processing','completed','cancelled')) DEFAULT 'ordered',
            notes TEXT DEFAULT '',
            ordered_by TEXT NOT NULL,
            performed_by TEXT,
            results_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prescription_id TEXT NOT NULL UNIQUE,
            patient_id TEXT NOT NULL REFERENCES patients(patient_id),
            doctor_name TEXT NOT NULL,
            diagnosis TEXT NOT NULL DEFAULT '',
            notes TEXT DEFAULT '',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prescription_medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
            medication_name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            frequency TEXT NOT NULL,
            duration TEXT NOT NULL,
            route TEXT NOT NULL DEFAULT 'oral',
            instructions TEXT DEFAULT '',
            is_substituted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            type TEXT NOT NULL CHECK(type IN ('appointment','billing','lab','prescription','admission','system')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            reference_type TEXT,
            reference_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_patients_active_name ON patients (is_active, lower(name));
        CREATE INDEX IF NOT EXISTS idx_patients_active_patient_id ON patients (is_active, lower(patient_id));
        CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments (patient_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
        CREATE INDEX IF NOT EXISTS idx_report_analyses_patient_id ON report_analyses (patient_id);
        CREATE INDEX IF NOT EXISTS idx_staff_email ON staff (email);
        CREATE INDEX IF NOT EXISTS idx_staff_department ON staff (department_id);
        CREATE INDEX IF NOT EXISTS idx_wards_department ON wards (department_id);
        CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds (ward_id);
        CREATE INDEX IF NOT EXISTS idx_beds_patient ON beds (current_patient_id);
        CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing (patient_id);
        CREATE INDEX IF NOT EXISTS idx_billing_status ON billing (payment_status);
        CREATE INDEX IF NOT EXISTS idx_lab_patient ON lab_tests (patient_id);
        CREATE INDEX IF NOT EXISTS idx_lab_status ON lab_tests (status);
        CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id);
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens (token);
        CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens (user_id);
        """
    )
