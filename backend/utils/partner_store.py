import json
import os
from typing import Iterable
from utils.db_core import DB_PATH, get_conn

VOL_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "voluntaris.json")
EMP_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "empreses.json")


def init_partner_store() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_conn(enable_foreign_keys=True) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS voluntaris (
                id TEXT PRIMARY KEY,
                nom TEXT,
                rol TEXT,
                projecte TEXT,
                email TEXT,
                telefon TEXT,
                municipi TEXT,
                lat REAL,
                lng REAL,
                habilitats_json TEXT,
                disponibilitat_json TEXT,
                max_persones INTEGER DEFAULT 5,
                persones_actuals INTEGER DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS empreses (
                id TEXT PRIMARY KEY,
                nom TEXT,
                tipus_colaboracio_json TEXT,
                recursos_oferts_json TEXT,
                keywords_json TEXT,
                contacte TEXT,
                hores_voluntariat_disponibles INTEGER DEFAULT 0
            )
            """
        )


def _load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def seed_partners_if_empty() -> None:
    with get_conn(enable_foreign_keys=True) as conn:
        vol_count = conn.execute("SELECT COUNT(*) AS c FROM voluntaris").fetchone()["c"]
        emp_count = conn.execute("SELECT COUNT(*) AS c FROM empreses").fetchone()["c"]

        if vol_count == 0:
            for v in _load_json(VOL_JSON_PATH):
                conn.execute(
                    """
                    INSERT INTO voluntaris (
                        id, nom, rol, projecte, email, telefon, municipi, lat, lng,
                        habilitats_json, disponibilitat_json, max_persones, persones_actuals
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        v.get("id"),
                        v.get("nom"),
                        v.get("rol"),
                        v.get("projecte"),
                        v.get("email"),
                        v.get("telefon"),
                        v.get("municipi"),
                        v.get("lat"),
                        v.get("lng"),
                        json.dumps(v.get("habilitats", []), ensure_ascii=False),
                        json.dumps(v.get("disponibilitat", []), ensure_ascii=False),
                        int(v.get("max_persones", 5) or 5),
                        int(v.get("persones_actuals", 0) or 0),
                    ),
                )

        if emp_count == 0:
            for e in _load_json(EMP_JSON_PATH):
                # Input uses "tipus_col·laboració" (accent). Keep normalized DB column.
                tipus = e.get("tipus_col·laboració", [])
                conn.execute(
                    """
                    INSERT INTO empreses (
                        id, nom, tipus_colaboracio_json, recursos_oferts_json,
                        keywords_json, contacte, hores_voluntariat_disponibles
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        e.get("id"),
                        e.get("nom"),
                        json.dumps(tipus, ensure_ascii=False),
                        json.dumps(e.get("recursos_oferts", []), ensure_ascii=False),
                        json.dumps(e.get("keywords", []), ensure_ascii=False),
                        e.get("contacte"),
                        int(e.get("hores_voluntariat_disponibles", 0) or 0),
                    ),
                )


def get_voluntaris_for_matching() -> list[dict]:
    with get_conn(enable_foreign_keys=True) as conn:
        rows = conn.execute("SELECT * FROM voluntaris").fetchall()

    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "nom": r["nom"],
                "rol": r["rol"],
                "projecte": r["projecte"],
                "email": r["email"],
                "telefon": r["telefon"],
                "municipi": r["municipi"],
                "lat": r["lat"],
                "lng": r["lng"],
                "habilitats": json.loads(r["habilitats_json"] or "[]"),
                "disponibilitat": json.loads(r["disponibilitat_json"] or "[]"),
                "max_persones": int(r["max_persones"] or 0),
                "persones_actuals": int(r["persones_actuals"] or 0),
            }
        )
    return out


def get_empreses_for_matching() -> list[dict]:
    with get_conn(enable_foreign_keys=True) as conn:
        rows = conn.execute("SELECT * FROM empreses").fetchall()

    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "nom": r["nom"],
                "tipus_col·laboració": json.loads(r["tipus_colaboracio_json"] or "[]"),
                "recursos_oferts": json.loads(r["recursos_oferts_json"] or "[]"),
                "keywords": json.loads(r["keywords_json"] or "[]"),
                "contacte": r["contacte"],
                "hores_voluntariat_disponibles": int(r["hores_voluntariat_disponibles"] or 0),
            }
        )
    return out


def apply_volunteer_load_delta(voluntari_ids: Iterable[str], delta: int) -> None:
    ids = [str(i).strip() for i in voluntari_ids if str(i).strip()]
    if not ids:
        return

    with get_conn(enable_foreign_keys=True) as conn:
        for vol_id in ids:
            row = conn.execute(
                "SELECT persones_actuals, max_persones FROM voluntaris WHERE id = ?",
                (vol_id,),
            ).fetchone()
            if not row:
                continue
            current = int(row["persones_actuals"] or 0)
            max_people = int(row["max_persones"] or current)
            next_value = max(0, min(current + delta, max_people))
            conn.execute(
                "UPDATE voluntaris SET persones_actuals = ? WHERE id = ?",
                (next_value, vol_id),
            )
