# Aquest mòdul gestiona tota la persistència i els dashboards de Càritas.
# Usem S3 com a base de dades lleugera: cada entitat (voluntari, empresa,
# expedient) es guarda com un JSON independent amb un ID únic.
# Els dashboards agreguen aquestes dades per mostrar impacte real.

from flask import Blueprint, request, jsonify
import boto3, json, os, uuid
from datetime import datetime

dashboard_bp = Blueprint("dashboard", __name__)

AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "hackaton-bucket")


def get_s3():
    return boto3.client("s3")


def s3_put(key: str, data: dict):
    try:
        get_s3().put_object(
            Bucket=AWS_S3_BUCKET,
            Key=key,
            Body=json.dumps(data, ensure_ascii=False),
            ContentType="application/json"
        )
        return True
    except Exception as e:
        print(f"S3 put error: {e}")
        return False


def s3_get(key: str) -> dict | None:
    try:
        obj = get_s3().get_object(Bucket=AWS_S3_BUCKET, Key=key)
        return json.loads(obj["Body"].read())
    except Exception:
        return None


def s3_list(prefix: str) -> list:
    try:
        objs = get_s3().list_objects_v2(Bucket=AWS_S3_BUCKET, Prefix=prefix)
        items = []
        for obj in objs.get("Contents", []):
            data = s3_get(obj["Key"])
            if data:
                items.append(data)
        return items
    except Exception:
        return []


# ── REGISTRE VOLUNTARI ────────────────────────────────────
@dashboard_bp.route("/register/voluntari", methods=["POST"])
def register_voluntari():
    data = request.json or {}
    voluntari_id = str(uuid.uuid4())[:8]
    perfil = {
        "id": voluntari_id,
        "nom": data.get("nom", "Voluntari/a"),
        "email": data.get("email", ""),
        "municipi": data.get("municipi", "Tarragona"),
        "habilitats": data.get("habilitats", []),
        "disponibilitat": data.get("disponibilitat", ""),
        "projecte_assignat": data.get("projecte_assignat", ""),
        "match_result": data.get("match_result", {}),
        "persones_ajudades": [],
        "hores_contribuides": 0,
        "data_registre": datetime.utcnow().isoformat(),
        "role": "voluntari"
    }
    s3_put(f"voluntaris/{voluntari_id}.json", perfil)
    return jsonify({"id": voluntari_id, "perfil": perfil}), 201


# ── DASHBOARD VOLUNTARI ───────────────────────────────────
@dashboard_bp.route("/dashboard/voluntari/<voluntari_id>", methods=["GET"])
def dashboard_voluntari(voluntari_id):
    perfil = s3_get(f"voluntaris/{voluntari_id}.json")
    if not perfil:
        return jsonify({"error": "Voluntari no trobat"}), 404

    # Busquem expedients on aquest voluntari està assignat
    expedients = s3_list("expedients/")
    casos_actius = [e for e in expedients
                    if voluntari_id in [v.get("id") for v in e.get("voluntaris_assignats", [])]]

    return jsonify({
        "perfil": perfil,
        "casos_actius": casos_actius,
        "total_persones_ajudades": len(casos_actius),
        "hores_contribuides": perfil.get("hores_contribuides", 0),
        "projecte": perfil.get("projecte_assignat", ""),
    }), 200


# ── REGISTRE EMPRESA ──────────────────────────────────────
@dashboard_bp.route("/register/empresa", methods=["POST"])
def register_empresa():
    data = request.json or {}
    empresa_id = str(uuid.uuid4())[:8]
    perfil = {
        "id": empresa_id,
        "nom": data.get("nom", ""),
        "email": data.get("email", ""),
        "sector": data.get("sector", ""),
        "tipus_col·laboracio": data.get("tipus_col·laboracio", []),
        "recursos_oferts": data.get("recursos_oferts", []),
        "data_registre": datetime.utcnow().isoformat(),
        "role": "empresa"
    }
    s3_put(f"empreses/{empresa_id}.json", perfil)
    return jsonify({"id": empresa_id, "perfil": perfil}), 201


# ── DASHBOARD EMPRESA ─────────────────────────────────────
@dashboard_bp.route("/dashboard/empresa/<empresa_id>", methods=["GET"])
def dashboard_empresa(empresa_id):
    perfil = s3_get(f"empreses/{empresa_id}.json")
    if not perfil:
        return jsonify({"error": "Empresa no trobada"}), 404

    # Busquem expedients on s'han usat recursos d'aquesta empresa
    expedients = s3_list("expedients/")
    recursos_empresa = perfil.get("recursos_oferts", [])
    impacte = [e for e in expedients
               if any(r in [rec.get("tipus") for rec in e.get("recursos_assignats", [])]
                      for r in recursos_empresa)]

    distribucio = {}
    for exp in impacte:
        for rec in exp.get("recursos_assignats", []):
            t = rec.get("tipus", "altres")
            distribucio[t] = distribucio.get(t, 0) + 1

    return jsonify({
        "perfil": perfil,
        "total_persones_impactades": len(impacte),
        "distribucio_recursos": distribucio,
        "expedients_recents": impacte[-5:],
    }), 200


# ── EXPEDIENTS (TREBALLADOR) ──────────────────────────────
@dashboard_bp.route("/expedients", methods=["GET"])
def get_expedients():
    # Retorna tots els expedients ordenats per urgència i data
    expedients = s3_list("expedients/")
    expedients.sort(key=lambda x: (
        {"critica": 0, "alta": 1, "mitjana": 2, "baixa": 3}.get(x.get("urgencia", "baixa"), 4),
        x.get("data_creacio", "")
    ))
    return jsonify(expedients), 200


@dashboard_bp.route("/expedient", methods=["POST"])
def create_expedient():
    # El treballador introdueix una fitxa social i el motor fa el matching
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from engine.keyword_parser import extract_keywords
    from engine.gemini_analyst import analyze_with_gemini
    from engine.matcher import match_all

    data = request.json or {}
    exp_id = str(uuid.uuid4())[:8]

    fitxa = data.get("fitxa", {})
    keywords = extract_keywords(fitxa)
    analysis = analyze_with_gemini(fitxa, keywords)
    match_result = match_all(fitxa, analysis, keywords)

    expedient = {
        "id": exp_id,
        "fitxa": fitxa,
        "urgencia": match_result.get("urgencia", "mitjana"),
        "perfil_resum": match_result.get("perfil_resum", ""),
        "recursos_assignats": match_result.get("recursos", []),
        "voluntaris_assignats": match_result.get("voluntaris", []),
        "centre_assignat": match_result.get("centre_mes_proper", {}),
        "keywords": keywords,
        "data_creacio": datetime.utcnow().isoformat(),
        "estat": "actiu"
    }
    s3_put(f"expedients/{exp_id}.json", expedient)
    return jsonify(expedient), 201


@dashboard_bp.route("/expedient/<exp_id>", methods=["GET"])
def get_expedient(exp_id):
    expedient = s3_get(f"expedients/{exp_id}.json")
    if not expedient:
        return jsonify({"error": "Expedient no trobat"}), 404
    return jsonify(expedient), 200
