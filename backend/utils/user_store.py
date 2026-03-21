import os
import sqlite3
from datetime import datetime
from typing import Any
from werkzeug.security import generate_password_hash
from utils.db_core import DB_PATH, get_conn

def init_user_store() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                nom TEXT,
                company_name TEXT,
                location TEXT,
                created_at TEXT NOT NULL
            )
            """
        )


def create_user(
    user_id: str,
    email: str,
    password_hash: str,
    role: str,
    nom: str | None = None,
    company_name: str | None = None,
    location: str | None = None,
) -> bool:
    try:
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, role, nom, company_name, location, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    email.lower().strip(),
                    password_hash,
                    role,
                    nom,
                    company_name,
                    location,
                    datetime.utcnow().isoformat(),
                ),
            )
        return True
    except sqlite3.IntegrityError:
        return False


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


def ensure_master_admin() -> dict[str, str]:
    """Ensure a default worker admin account exists.

    Defaults can be overridden with MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD.
    """
    email = os.getenv("MASTER_ADMIN_EMAIL", "admin@caritas.org").strip().lower()
    password = os.getenv("MASTER_ADMIN_PASSWORD", "Admin1234!").strip()

    existing = get_user_by_email(email)
    if existing:
        return {"email": email, "password": password}

    create_user(
        user_id="MASTERADMIN01",
        email=email,
        password_hash=generate_password_hash(password),
        role="treballador",
        nom="Admin Master",
        location="Tarragona",
    )
    return {"email": email, "password": password}
