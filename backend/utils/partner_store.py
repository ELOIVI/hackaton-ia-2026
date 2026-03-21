import json
import os
from typing import Iterable
from utils.db_core import DB_PATH, get_conn

VOL_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "voluntaris.json")
EMP_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "empreses.json")


def _infer_gender_from_identifier(identifier: str) -> str:
    digits = "".join(ch for ch in str(identifier or "") if ch.isdigit())
    if not digits:
        return "dona"
    return "dona" if int(digits[-1]) % 2 == 0 else "home"


def _normalize_gender(value: str | None, fallback_id: str | None = None) -> str:
    text = str(value or "").strip().lower()
    if text in {"dona", "f", "female", "mujer"}:
        return "dona"
    if text in {"home", "h", "male", "hombre"}:
        return "home"
    return _infer_gender_from_identifier(str(fallback_id or ""))


def init_partner_store() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_conn(enable_foreign_keys=True) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS voluntaris (
                id TEXT PRIMARY KEY,
                nom TEXT,
                genere TEXT,
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
        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(voluntaris)").fetchall()
        }
        if "genere" not in columns:
            conn.execute("ALTER TABLE voluntaris ADD COLUMN genere TEXT")
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
                        id, nom, genere, rol, projecte, email, telefon, municipi, lat, lng,
                        habilitats_json, disponibilitat_json, max_persones, persones_actuals
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        v.get("id"),
                        v.get("nom"),
                        _normalize_gender(v.get("genere"), fallback_id=v.get("id")),
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


def ensure_partner_admin_entries() -> dict[str, str]:
    with get_conn(enable_foreign_keys=True) as conn:
        vol_admin_id = "VOLADMIN01"
        emp_admin_id = "EMPADMIN01"

        vol_row = conn.execute(
            "SELECT id FROM voluntaris WHERE id = ?",
            (vol_admin_id,),
        ).fetchone()
        if not vol_row:
            conn.execute(
                """
                INSERT INTO voluntaris (
                    id, nom, genere, rol, projecte, email, telefon, municipi, lat, lng,
                    habilitats_json, disponibilitat_json, max_persones, persones_actuals
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vol_admin_id,
                    "Admin Voluntariat",
                    "dona",
                    "Administrador/a",
                    "Coordinacio General",
                    "adminvoluntari@caritas.org",
                    "600000001",
                    "Tarragona",
                    41.1189,
                    1.2445,
                    json.dumps(["gestio", "acollida", "treball_social"], ensure_ascii=False),
                    json.dumps(["dilluns_mati", "dimarts_mati", "dimecres_mati"], ensure_ascii=False),
                    20,
                    0,
                ),
            )
        else:
            conn.execute(
                "UPDATE voluntaris SET email = ? WHERE id = ?",
                ("adminvoluntari@caritas.org", vol_admin_id),
            )

        emp_row = conn.execute(
            "SELECT id FROM empreses WHERE id = ?",
            (emp_admin_id,),
        ).fetchone()
        if not emp_row:
            conn.execute(
                """
                INSERT INTO empreses (
                    id, nom, tipus_colaboracio_json, recursos_oferts_json,
                    keywords_json, contacte, hores_voluntariat_disponibles
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    emp_admin_id,
                    "Empresa Admin Càritas",
                    json.dumps(["voluntariat_corporatiu", "donacio_economica"], ensure_ascii=False),
                    json.dumps(["alimentacio", "transport", "orientacio_professional"], ensure_ascii=False),
                    json.dumps(["coordinacio", "solidaritat", "suport_social"], ensure_ascii=False),
                    "adminempresa@caritas.org",
                    200,
                ),
            )
        else:
            conn.execute(
                "UPDATE empreses SET contacte = ? WHERE id = ?",
                ("adminempresa@caritas.org", emp_admin_id),
            )

    return {"voluntari_admin_id": vol_admin_id, "empresa_admin_id": emp_admin_id}


def get_voluntaris_for_matching() -> list[dict]:
    with get_conn(enable_foreign_keys=True) as conn:
        rows = conn.execute("SELECT * FROM voluntaris").fetchall()

    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "nom": r["nom"],
                "genere": _normalize_gender(r["genere"], fallback_id=r["id"]),
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
