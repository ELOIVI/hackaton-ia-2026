import argparse
import json
import random
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from werkzeug.security import generate_password_hash

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from utils.db_core import DB_PATH, get_conn  # noqa: E402
from utils.user_store import ensure_master_admin, init_user_store, create_user  # noqa: E402
from utils.partner_store import init_partner_store  # noqa: E402
from utils.expedient_store import init_expedient_store, create_expedient_record  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent

MUNICIPIS_COORDS = {
    "Tarragona": (41.1189, 1.2445),
    "Reus": (41.1561, 1.1065),
    "Cambrils": (41.0674, 1.0580),
    "Salou": (41.0752, 1.1422),
    "Vila-seca": (41.1047, 1.1469),
    "Torredembarra": (41.1467, 1.3961),
    "Valls": (41.2867, 1.2500),
    "El Vendrell": (41.2183, 1.5358),
    "Calafell": (41.2000, 1.5667),
    "Tortosa": (40.8122, 0.5211),
    "Amposta": (40.7150, 0.5800),
    "Montblanc": (41.3768, 1.1616),
    "Falset": (41.1467, 0.8196),
    "Alcover": (41.2627, 1.1707),
    "Constanti": (41.1531, 1.2156),
}

HABILITATS_POOL = [
    "acompanyament",
    "orientacio",
    "gestio",
    "alimentacio",
    "logistica",
    "repartiment",
    "assessoria_juridica",
    "documentacio",
    "insercio_laboral",
    "formacio",
    "suport_escolar",
    "atencio_infants",
    "salut_mental",
    "gent_gran",
    "mediacio_habitatge",
    "traduccio",
    "acollida",
    "treball_social",
]

DISPONIBILITAT_POOL = [
    "dilluns_mati",
    "dilluns_tarda",
    "dimarts_mati",
    "dimarts_tarda",
    "dimecres_mati",
    "dimecres_tarda",
    "dijous_mati",
    "dijous_tarda",
    "divendres_mati",
    "divendres_tarda",
    "caps_setmana",
]

TIPUS_RECURS = [
    "alimentacio",
    "habitatge",
    "educacio",
    "salut",
    "salut_mental",
    "insercio_laboral",
    "legal",
    "espai",
    "transport",
]

NECESSITATS_POOL = [
    "alimentacio",
    "habitatge",
    "salut",
    "educacio",
    "formacio",
    "insercio_laboral",
    "suport_psicologic",
    "voluntariat",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate realistic massive data for all DBs")
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--workers", type=int, default=80)
    parser.add_argument("--volunteer-users", type=int, default=220)
    parser.add_argument("--company-users", type=int, default=140)
    parser.add_argument("--voluntaris", type=int, default=900)
    parser.add_argument("--empreses", type=int, default=260)
    parser.add_argument("--resources", type=int, default=160)
    parser.add_argument("--organizations", type=int, default=120)
    parser.add_argument("--projects", type=int, default=90)
    parser.add_argument("--expedients", type=int, default=5000)
    parser.add_argument("--resolved-ratio", type=float, default=0.47)
    parser.add_argument("--no-reset", action="store_true", help="Do not clear existing SQLite tables")
    return parser.parse_args()


def load_json_array(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_json_array(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


def ordered_rows(rows: list[dict[str, Any]], keys: list[str]) -> list[dict[str, Any]]:
    def key_fn(item: dict[str, Any]):
        return tuple(str(item.get(k, "")).lower() for k in keys)

    return sorted(rows, key=key_fn)


def jitter_coords(base_lat: float, base_lng: float) -> tuple[float, float]:
    return round(base_lat + random.uniform(-0.03, 0.03), 6), round(base_lng + random.uniform(-0.03, 0.03), 6)


def random_municipi() -> str:
    return random.choice(list(MUNICIPIS_COORDS.keys()))


def build_voluntaris(count: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(1, count + 1):
        municipi = random_municipi()
        lat, lng = jitter_coords(*MUNICIPIS_COORDS[municipi])
        skills = random.sample(HABILITATS_POOL, random.randint(3, 6))
        availability = random.sample(DISPONIBILITAT_POOL, random.randint(2, 4))
        max_persones = random.randint(3, 8)
        rows.append(
            {
                "id": f"VOL{i:04d}",
                "nom": f"Voluntari {i:04d}",
                "rol": random.choice(["Voluntari/a", "Tecnic/a", "Coordinador/a"]),
                "projecte": random.choice([
                    "Acollida i Acompanyament",
                    "Insercio Sociolaboral",
                    "Habitatge i Emergencia",
                    "Atencio Familiars",
                    "Salut Mental",
                    "Gent Gran",
                ]),
                "email": f"voluntari{i:04d}@caritas.local",
                "telefon": f"6{random.randint(10000000, 99999999)}",
                "municipi": municipi,
                "lat": lat,
                "lng": lng,
                "habilitats": skills,
                "disponibilitat": availability,
                "max_persones": max_persones,
                "persones_actuals": 0,
            }
        )
    return ordered_rows(rows, ["municipi", "nom", "id"])


def build_empreses(count: int) -> list[dict[str, Any]]:
    collaboracio_pool = [
        "voluntariat_corporatiu",
        "donacio_economica",
        "donacio_especie",
        "formacio",
        "insercio_laboral",
    ]
    recursos_pool = [
        "alimentacio",
        "material_escolar",
        "equipament_llar",
        "espais_formacio",
        "transport",
        "orientacio_professional",
        "beques_formacio",
        "serveis_legal",
    ]
    keyword_pool = HABILITATS_POOL + NECESSITATS_POOL

    rows: list[dict[str, Any]] = []
    for i in range(1, count + 1):
        nom = f"Empresa Solidaria {i:04d}"
        rows.append(
            {
                "id": f"EMP{i:04d}",
                "nom": nom,
                "tipus_col·laboració": random.sample(collaboracio_pool, random.randint(1, 3)),
                "recursos_oferts": random.sample(recursos_pool, random.randint(2, 4)),
                "keywords": random.sample(keyword_pool, random.randint(4, 8)),
                "contacte": f"contacte{i:04d}@empresa.local",
                "hores_voluntariat_disponibles": random.choice([0, 20, 40, 80, 120]),
            }
        )
    return ordered_rows(rows, ["nom", "id"])


def build_recursos(count: int, centres: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    centre_ids = [c.get("id") for c in centres if c.get("id")]
    if not centre_ids:
        centre_ids = ["CTR001"]

    for i in range(1, count + 1):
        tipus = random.choice(TIPUS_RECURS)
        nom = f"Recurs {tipus.title()} {i:04d}"
        rows.append(
            {
                "id": f"REC{i:04d}",
                "nom": nom,
                "tipus": tipus,
                "keywords": random.sample(NECESSITATS_POOL + HABILITATS_POOL, random.randint(4, 8)),
                "quantitat_disponible": random.randint(10, 250),
                "unitat": random.choice(["places", "ajudes/mes", "lots", "sessions/mes"]),
                "centre_id": random.choice(centre_ids),
                "requisits": random.sample(["ingressos_baixos", "empadronat", "risc_exclusio", "menors_a_carrec"], random.randint(0, 2)),
            }
        )
    return ordered_rows(rows, ["tipus", "nom", "id"])


def build_organitzacions(count: int) -> list[dict[str, Any]]:
    serveis_pool = [
        "alimentacio",
        "roba",
        "acompanyament_sanitari",
        "assessoria_juridica",
        "documentacio",
        "habitatge_social",
        "formacio_ocupacional",
        "orientacio_laboral",
        "suport_psicologic",
    ]

    rows: list[dict[str, Any]] = []
    for i in range(1, count + 1):
        municipi = random_municipi()
        lat, lng = jitter_coords(*MUNICIPIS_COORDS[municipi])
        rows.append(
            {
                "id": f"ORG{i:04d}",
                "nom": f"Organitzacio Social {i:04d}",
                "tipus": random.choice(["ONG", "servei_public", "fundacio"]),
                "serveis": random.sample(serveis_pool, random.randint(2, 5)),
                "keywords": random.sample(NECESSITATS_POOL + HABILITATS_POOL, random.randint(4, 8)),
                "contacte": f"org{i:04d}@social.local",
                "municipi": municipi,
                "lat": lat,
                "lng": lng,
                "conveni_caritas": random.choice([True, True, False]),
            }
        )
    return ordered_rows(rows, ["municipi", "nom", "id"])


def build_projectes(count: int, recursos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    resource_ids = [r["id"] for r in recursos]
    if not resource_ids:
        resource_ids = ["REC0001"]

    rows: list[dict[str, Any]] = []
    for i in range(1, count + 1):
        nom = f"Projecte Social {i:04d}"
        rows.append(
            {
                "id": f"PRJ{i:04d}",
                "nom": nom,
                "descripcio": f"Programa integral {i:04d} per atendre situacions socials complexes.",
                "perfil_beneficiari": random.choice([
                    "Families en risc d'exclusio",
                    "Persones aturades de llarga durada",
                    "Persones migrades sense xarxa de suport",
                    "Gent gran en situacio de soledat",
                    "Joves sense itinerari formatiu",
                ]),
                "recursos_associats": random.sample(resource_ids, random.randint(1, min(4, len(resource_ids)))),
                "keywords": random.sample(NECESSITATS_POOL + HABILITATS_POOL, random.randint(4, 7)),
            }
        )
    return ordered_rows(rows, ["nom", "id"])


def urgency_from_fitxa(edat: int, menors: int, sense_ingressos: bool, habitatge: str, situacio_laboral: str) -> str:
    score = 0
    if edat >= 75:
        score += 2
    if edat <= 23:
        score += 1
    score += min(menors, 3)
    if sense_ingressos:
        score += 4
    if habitatge in {"Sense habitatge", "Infrahabitatge"}:
        score += 4
    if situacio_laboral in {"atur", "sense_contracte"}:
        score += 2

    if score >= 8:
        return "critica"
    if score >= 6:
        return "alta"
    if score >= 3:
        return "mitjana"
    return "baixa"


def random_fitxa() -> dict[str, Any]:
    municipi = random_municipi()
    lat, lng = jitter_coords(*MUNICIPIS_COORDS[municipi])
    edat = random.randint(18, 90)
    menors = random.choice([0, 0, 1, 2, 3, 4])
    habitatge = random.choice(["Llogada", "Rellogada", "Propietat", "Infrahabitatge", "Sense habitatge"])
    situacio_laboral = random.choice(["feina_estable", "feina_precaria", "atur", "sense_contracte", "baixa_medica"])
    ingressos = random.choice([0, 0, 500, 800, 1200, 1500])

    return {
        "edat": edat,
        "situacio_laboral": situacio_laboral,
        "ingressos_aproximats": ingressos,
        "dependents_a_carrec": menors,
        "discapacitat_o_malaltia": random.choice([False, False, True]),
        "tipus_habitatge": habitatge,
        "municipi": municipi,
        "codi_postal": str(random.randint(43000, 43899)),
        "coordenades": [lng, lat],
        "lat": lat,
        "lng": lng,
        "menors_a_carrec": menors,
        "observacions": random.choice([
            "Requereix seguiment mensual",
            "Situacio administrativa pendent",
            "Sense xarxa familiar de suport",
            "Necessita reforc emocional",
            "Demana orientacio laboral urgent",
        ]),
    }


def random_keywords() -> list[str]:
    return random.sample(NECESSITATS_POOL + HABILITATS_POOL, random.randint(4, 9))


def random_needs_payload() -> dict[str, int]:
    return {k: random.randint(0, 5) for k in NECESSITATS_POOL}


def reset_sqlite() -> None:
    with get_conn(enable_foreign_keys=True) as conn:
        conn.execute("DELETE FROM expedient_empreses")
        conn.execute("DELETE FROM expedient_voluntaris")
        conn.execute("DELETE FROM expedients")
        conn.execute("DELETE FROM voluntaris")
        conn.execute("DELETE FROM empreses")
        conn.execute("DELETE FROM users")


def insert_partners_sqlite(voluntaris: list[dict[str, Any]], empreses: list[dict[str, Any]]) -> None:
    with get_conn(enable_foreign_keys=True) as conn:
        for v in voluntaris:
            conn.execute(
                """
                INSERT INTO voluntaris (
                    id, nom, rol, projecte, email, telefon, municipi, lat, lng,
                    habilitats_json, disponibilitat_json, max_persones, persones_actuals
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    v["id"],
                    v["nom"],
                    v["rol"],
                    v["projecte"],
                    v["email"],
                    v["telefon"],
                    v["municipi"],
                    v["lat"],
                    v["lng"],
                    json.dumps(v["habilitats"], ensure_ascii=False),
                    json.dumps(v["disponibilitat"], ensure_ascii=False),
                    int(v["max_persones"]),
                    int(v["persones_actuals"]),
                ),
            )

        for e in empreses:
            conn.execute(
                """
                INSERT INTO empreses (
                    id, nom, tipus_colaboracio_json, recursos_oferts_json,
                    keywords_json, contacte, hores_voluntariat_disponibles
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    e["id"],
                    e["nom"],
                    json.dumps(e["tipus_col·laboració"], ensure_ascii=False),
                    json.dumps(e["recursos_oferts"], ensure_ascii=False),
                    json.dumps(e["keywords"], ensure_ascii=False),
                    e["contacte"],
                    int(e["hores_voluntariat_disponibles"]),
                ),
            )


def create_users(admin_email: str, workers: int, volunteer_users: int, company_users: int) -> tuple[str, list[str]]:
    admin = ensure_master_admin()
    admin_email = admin.get("email", admin_email)

    with get_conn() as conn:
        admin_row = conn.execute("SELECT id FROM users WHERE email = ?", (admin_email,)).fetchone()
    admin_id = admin_row["id"] if admin_row else "MASTERADMIN01"

    worker_ids = [admin_id]

    for i in range(1, workers + 1):
        user_id = f"WRK{i:04d}"
        ok = create_user(
            user_id=user_id,
            email=f"worker{i:04d}@caritas.local",
            password_hash=generate_password_hash("Worker123!"),
            role="treballador",
            nom=f"Treballador {i:04d}",
            location=random_municipi(),
        )
        if ok:
            worker_ids.append(user_id)

    for i in range(1, volunteer_users + 1):
        create_user(
            user_id=f"USR-VOL-{i:04d}",
            email=f"user.vol{i:04d}@caritas.local",
            password_hash=generate_password_hash("Volunteer123!"),
            role="voluntari",
            nom=f"Usuari Voluntari {i:04d}",
            location=random_municipi(),
        )

    for i in range(1, company_users + 1):
        create_user(
            user_id=f"USR-EMP-{i:04d}",
            email=f"user.emp{i:04d}@caritas.local",
            password_hash=generate_password_hash("Company123!"),
            role="empresa",
            nom=f"Usuari Empresa {i:04d}",
            company_name=f"Empresa Solidaria {i:04d}",
            location=random_municipi(),
        )

    return admin_id, worker_ids


def generate_expedients(
    count: int,
    resolved_ratio: float,
    workers: list[str],
    admin_id: str,
    centres: list[dict[str, Any]],
    recursos: list[dict[str, Any]],
    voluntaris: list[dict[str, Any]],
    empreses: list[dict[str, Any]],
) -> tuple[int, int]:
    resource_by_type: dict[str, list[dict[str, Any]]] = {}
    for r in recursos:
        resource_by_type.setdefault(r.get("tipus", "altres"), []).append(r)

    centres_by_municipi: dict[str, list[dict[str, Any]]] = {}
    for c in centres:
        municipi = str(c.get("municipi", "")).strip() or "Tarragona"
        centres_by_municipi.setdefault(municipi, []).append(c)

    closed = 0
    active = 0

    for i in range(1, count + 1):
        fitxa = random_fitxa()
        urgencia = urgency_from_fitxa(
            edat=int(fitxa["edat"]),
            menors=int(fitxa["menors_a_carrec"]),
            sense_ingressos=int(fitxa["ingressos_aproximats"]) <= 0,
            habitatge=str(fitxa["tipus_habitatge"]),
            situacio_laboral=str(fitxa["situacio_laboral"]),
        )

        municipi = str(fitxa.get("municipi", "Tarragona"))
        centre_options = centres_by_municipi.get(municipi) or centres
        centre = random.choice(centre_options) if centre_options else {}

        if urgencia == "critica":
            vol_n = random.randint(2, 4)
            emp_n = random.randint(1, 2)
        elif urgencia == "alta":
            vol_n = random.randint(1, 3)
            emp_n = random.randint(0, 2)
        elif urgencia == "mitjana":
            vol_n = random.randint(1, 2)
            emp_n = random.randint(0, 1)
        else:
            vol_n = random.randint(0, 1)
            emp_n = random.randint(0, 1)

        assigned_vols = random.sample(voluntaris, min(vol_n, len(voluntaris))) if voluntaris else []
        assigned_emps = random.sample(empreses, min(emp_n, len(empreses))) if empreses else []

        rec_types = random.sample(TIPUS_RECURS, random.randint(2, 4))
        recs: list[dict[str, Any]] = []
        for t in rec_types:
            options = resource_by_type.get(t, [])
            if options:
                recs.append(random.choice(options))

        created_by = admin_id if random.random() < 0.35 else random.choice(workers)
        created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 400), hours=random.randint(0, 23))

        is_closed = random.random() < resolved_ratio
        resolved_by = None
        closed_at_iso = None
        state = "actiu"
        if is_closed:
            state = "tancat"
            resolved_by = admin_id if random.random() < 0.40 else random.choice(workers)
            closed_at = created_at + timedelta(days=random.randint(1, 120), hours=random.randint(0, 23))
            closed_at_iso = closed_at.isoformat()
            closed += 1
        else:
            active += 1

        profile = f"Persona de {fitxa['edat']} anys a {municipi} amb risc {urgencia} i necessitats prioritaries de suport social."

        expedient = {
            "id": f"EXP{i:06d}",
            "fitxa": fitxa,
            "urgencia": urgencia,
            "perfil_resum": profile,
            "recursos_assignats": recs,
            "voluntaris_assignats": [
                {"id": v["id"], "nom": v["nom"], "projecte": v.get("projecte")} for v in assigned_vols
            ],
            "empreses_assignades": [
                {"id": e["id"], "nom": e["nom"]} for e in assigned_emps
            ],
            "centre_assignat": {
                "id": centre.get("id"),
                "nom": centre.get("nom"),
                "municipi": centre.get("municipi"),
                "lat": centre.get("lat"),
                "lng": centre.get("lng"),
            },
            "keywords": random_keywords(),
            "necessitats": random_needs_payload(),
            "data_creacio": created_at.isoformat(),
            "data_tancament": closed_at_iso,
            "estat": state,
            "font": random.choice(["manual", "chatbot", "import"]) if i % 7 == 0 else "manual",
            "created_by_user_id": created_by,
            "resolved_by_user_id": resolved_by,
        }
        create_expedient_record(
            expedient,
            created_by_user_id=created_by,
            resolved_by_user_id=resolved_by,
        )

    return active, closed


def refresh_volunteer_loads() -> None:
    with get_conn(enable_foreign_keys=True) as conn:
        conn.execute("UPDATE voluntaris SET persones_actuals = 0")
        rows = conn.execute(
            "SELECT voluntaris_assignats_json, estat FROM expedients WHERE estat = 'actiu'"
        ).fetchall()

        load_map: dict[str, int] = {}
        for row in rows:
            for vol in json.loads(row["voluntaris_assignats_json"] or "[]"):
                if isinstance(vol, dict) and vol.get("id"):
                    vol_id = str(vol["id"])
                    load_map[vol_id] = load_map.get(vol_id, 0) + 1

        for vol_id, load in load_map.items():
            max_row = conn.execute("SELECT max_persones FROM voluntaris WHERE id = ?", (vol_id,)).fetchone()
            if not max_row:
                continue
            max_persones = int(max_row["max_persones"] or 0)
            conn.execute(
                "UPDATE voluntaris SET persones_actuals = ? WHERE id = ?",
                (min(load, max_persones), vol_id),
            )


def sort_existing_catalogs() -> None:
    centres_path = DATA_DIR / "centres.json"
    if centres_path.exists():
        centres = load_json_array(centres_path)
        save_json_array(centres_path, ordered_rows(centres, ["municipi", "nom", "id"]))

    for fname, keys in [
        ("recursos.json", ["tipus", "nom", "id"]),
        ("organitzacions.json", ["municipi", "nom", "id"]),
        ("projectes_caritas.json", ["nom", "id"]),
    ]:
        path = DATA_DIR / fname
        if path.exists():
            rows = load_json_array(path)
            save_json_array(path, ordered_rows(rows, keys))


def insert_expedient_owner_on_all(db_path: Path, owner_id: str) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("UPDATE expedients SET created_by_user_id = COALESCE(created_by_user_id, ?)", (owner_id,))
        conn.execute(
            "UPDATE expedients SET resolved_by_user_id = COALESCE(resolved_by_user_id, ?) WHERE estat = 'tancat'",
            (owner_id,),
        )
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    init_user_store()
    init_partner_store()
    init_expedient_store()

    if not args.no_reset:
        reset_sqlite()

    centres = load_json_array(DATA_DIR / "centres.json")
    if not centres:
        centres = [
            {"id": "CTR001", "nom": "Caritas Tarragona Centre", "municipi": "Tarragona", "lat": 41.1189, "lng": 1.2445}
        ]

    sort_existing_catalogs()

    voluntaris = build_voluntaris(args.voluntaris)
    empreses = build_empreses(args.empreses)
    recursos = build_recursos(args.resources, centres)
    organitzacions = build_organitzacions(args.organizations)
    projectes = build_projectes(args.projects, recursos)

    save_json_array(DATA_DIR / "voluntaris.json", voluntaris)
    save_json_array(DATA_DIR / "empreses.json", empreses)
    save_json_array(DATA_DIR / "recursos.json", recursos)
    save_json_array(DATA_DIR / "organitzacions.json", organitzacions)
    save_json_array(DATA_DIR / "projectes_caritas.json", projectes)

    admin_id, workers = create_users(
        admin_email="admin@caritas.org",
        workers=args.workers,
        volunteer_users=args.volunteer_users,
        company_users=args.company_users,
    )

    insert_partners_sqlite(voluntaris, empreses)

    active, closed = generate_expedients(
        count=args.expedients,
        resolved_ratio=max(0.0, min(1.0, args.resolved_ratio)),
        workers=workers,
        admin_id=admin_id,
        centres=centres,
        recursos=recursos,
        voluntaris=voluntaris,
        empreses=empreses,
    )

    refresh_volunteer_loads()
    insert_expedient_owner_on_all(Path(DB_PATH), admin_id)

    print("== Massive seed completed ==")
    print(f"DB path: {DB_PATH}")
    print(f"Users workers(+admin): {len(workers)}")
    print(f"Voluntaris: {len(voluntaris)}")
    print(f"Empreses: {len(empreses)}")
    print(f"Recursos: {len(recursos)}")
    print(f"Organitzacions: {len(organitzacions)}")
    print(f"Projectes: {len(projectes)}")
    print(f"Expedients active: {active}")
    print(f"Expedients closed: {closed}")


if __name__ == "__main__":
    main()
