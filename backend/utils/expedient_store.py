import json
import os
from datetime import datetime
from typing import Any
from utils.db_core import DB_PATH, get_conn

def init_expedient_store() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_conn(enable_foreign_keys=True) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS expedients (
                id TEXT PRIMARY KEY,
                fitxa_json TEXT,
                urgencia TEXT,
                perfil_resum TEXT,
                recursos_assignats_json TEXT,
                voluntaris_assignats_json TEXT,
                centre_assignat_json TEXT,
                keywords_json TEXT,
                empreses_assignades_json TEXT,
                data_creacio TEXT NOT NULL,
                data_tancament TEXT,
                estat TEXT NOT NULL,
                font TEXT,
                created_by_user_id TEXT,
                resolved_by_user_id TEXT
            )
            """
        )
        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(expedients)").fetchall()
        }
        if "empreses_assignades_json" not in columns:
            conn.execute("ALTER TABLE expedients ADD COLUMN empreses_assignades_json TEXT")
        if "resolved_by_user_id" not in columns:
            conn.execute("ALTER TABLE expedients ADD COLUMN resolved_by_user_id TEXT")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS expedient_voluntaris (
                expedient_id TEXT NOT NULL,
                voluntari_id TEXT NOT NULL,
                PRIMARY KEY (expedient_id, voluntari_id),
                FOREIGN KEY (expedient_id) REFERENCES expedients(id) ON DELETE CASCADE,
                FOREIGN KEY (voluntari_id) REFERENCES voluntaris(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS expedient_empreses (
                expedient_id TEXT NOT NULL,
                empresa_id TEXT NOT NULL,
                PRIMARY KEY (expedient_id, empresa_id),
                FOREIGN KEY (expedient_id) REFERENCES expedients(id) ON DELETE CASCADE,
                FOREIGN KEY (empresa_id) REFERENCES empreses(id) ON DELETE CASCADE
            )
            """
        )


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def _json_loads(value: Any, default: Any):
    if value is None:
        return default
    try:
        return json.loads(value)
    except Exception:
        return default


def _row_to_expedient(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "fitxa": _json_loads(row["fitxa_json"], {}),
        "urgencia": row["urgencia"] or "mitjana",
        "perfil_resum": row["perfil_resum"] or "",
        "recursos_assignats": _json_loads(row["recursos_assignats_json"], []),
        "voluntaris_assignats": _json_loads(row["voluntaris_assignats_json"], []),
        "centre_assignat": _json_loads(row["centre_assignat_json"], {}),
        "keywords": _json_loads(row["keywords_json"], []),
        "empreses_assignades": _json_loads(row["empreses_assignades_json"], []),
        "data_creacio": row["data_creacio"],
        "data_tancament": row["data_tancament"],
        "estat": row["estat"],
        "font": row["font"] or "manual",
        "created_by_user_id": row["created_by_user_id"],
        "resolved_by_user_id": row["resolved_by_user_id"],
    }


def create_expedient_record(
    expedient: dict[str, Any],
    created_by_user_id: str | None = None,
    resolved_by_user_id: str | None = None,
):
    with get_conn(enable_foreign_keys=True) as conn:
        # Backward-compatible migration for existing DBs.
        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(expedients)").fetchall()
        }
        if "empreses_assignades_json" not in columns:
            conn.execute("ALTER TABLE expedients ADD COLUMN empreses_assignades_json TEXT")
        if "resolved_by_user_id" not in columns:
            conn.execute("ALTER TABLE expedients ADD COLUMN resolved_by_user_id TEXT")

        effective_created_by = created_by_user_id
        if effective_created_by is None:
            raw_created = expedient.get("created_by_user_id")
            effective_created_by = str(raw_created) if raw_created else None

        effective_resolved_by = resolved_by_user_id
        if effective_resolved_by is None:
            raw_resolved = expedient.get("resolved_by_user_id")
            effective_resolved_by = str(raw_resolved) if raw_resolved else None

        conn.execute(
            """
            INSERT OR REPLACE INTO expedients (
                id, fitxa_json, urgencia, perfil_resum, recursos_assignats_json,
                voluntaris_assignats_json, centre_assignat_json, keywords_json, empreses_assignades_json,
                data_creacio, data_tancament, estat, font, created_by_user_id, resolved_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                expedient.get("id"),
                _json_dumps(expedient.get("fitxa", {})),
                expedient.get("urgencia", "mitjana"),
                expedient.get("perfil_resum", ""),
                _json_dumps(expedient.get("recursos_assignats", [])),
                _json_dumps(expedient.get("voluntaris_assignats", [])),
                _json_dumps(expedient.get("centre_assignat", {})),
                _json_dumps(expedient.get("keywords", [])),
                _json_dumps(expedient.get("empreses_assignades", [])),
                expedient.get("data_creacio", datetime.utcnow().isoformat()),
                expedient.get("data_tancament"),
                expedient.get("estat", "actiu"),
                expedient.get("font", "manual"),
                effective_created_by,
                effective_resolved_by,
            ),
        )

        exp_id = expedient.get("id")
        if exp_id:
            conn.execute("DELETE FROM expedient_voluntaris WHERE expedient_id = ?", (exp_id,))
            conn.execute("DELETE FROM expedient_empreses WHERE expedient_id = ?", (exp_id,))

            for vol in expedient.get("voluntaris_assignats", []):
                vol_id = (vol or {}).get("id") if isinstance(vol, dict) else None
                if vol_id:
                    conn.execute(
                        "INSERT OR IGNORE INTO expedient_voluntaris (expedient_id, voluntari_id) VALUES (?, ?)",
                        (exp_id, str(vol_id)),
                    )

            for emp in expedient.get("empreses_assignades", []):
                emp_id = (emp or {}).get("id") if isinstance(emp, dict) else None
                if emp_id:
                    conn.execute(
                        "INSERT OR IGNORE INTO expedient_empreses (expedient_id, empresa_id) VALUES (?, ?)",
                        (exp_id, str(emp_id)),
                    )


def list_expedients() -> list[dict[str, Any]]:
    with get_conn(enable_foreign_keys=True) as conn:
        rows = conn.execute("SELECT * FROM expedients").fetchall()

    items = [_row_to_expedient(row) for row in rows]
    items.sort(
        key=lambda x: (
            {"critica": 0, "alta": 1, "mitjana": 2, "baixa": 3}.get(x.get("urgencia", "baixa"), 4),
            x.get("data_creacio", ""),
        )
    )
    return items


def list_expedients_by_creator(created_by_user_id: str) -> list[dict[str, Any]]:
    with get_conn(enable_foreign_keys=True) as conn:
        rows = conn.execute(
            "SELECT * FROM expedients WHERE created_by_user_id = ?",
            (created_by_user_id,),
        ).fetchall()

    items = [_row_to_expedient(row) for row in rows]
    items.sort(
        key=lambda x: (
            {"critica": 0, "alta": 1, "mitjana": 2, "baixa": 3}.get(x.get("urgencia", "baixa"), 4),
            x.get("data_creacio", ""),
        )
    )
    return items


def get_expedient(exp_id: str) -> dict[str, Any] | None:
    with get_conn(enable_foreign_keys=True) as conn:
        row = conn.execute("SELECT * FROM expedients WHERE id = ?", (exp_id,)).fetchone()
    return _row_to_expedient(row) if row else None


def close_expedient(exp_id: str, resolved_by_user_id: str | None = None) -> dict[str, Any] | None:
    expedient = get_expedient(exp_id)
    if not expedient:
        return None

    if expedient.get("estat") == "tancat":
        return expedient

    expedient["estat"] = "tancat"
    expedient["data_tancament"] = datetime.utcnow().isoformat()
    expedient["resolved_by_user_id"] = resolved_by_user_id
    create_expedient_record(
        expedient,
        created_by_user_id=expedient.get("created_by_user_id"),
        resolved_by_user_id=resolved_by_user_id,
    )
    return expedient
