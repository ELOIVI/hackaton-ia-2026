from flask import Blueprint, request, jsonify
import json, sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))

from gemini_call import call_gemini
from engine.keyword_parser import extract_keywords
from engine.gemini_analyst import analyze_with_gemini
from engine.matcher import match_all
from utils.rate_limit import rate_limited
from utils.auth_guard import require_auth
from utils.volunteer_load import increment_assigned_volunteers
from utils.expedient_store import create_expedient_record

chat_bp = Blueprint("chat", __name__)

SYSTEM_PERSONA = """Ets un assistent social empàtic de Càritas Diocesana de Tarragona.
La teva missió és recollir informació sobre la situació de la persona per connectar-la
amb els recursos adequats. Fes preguntes clares i amables, d'una en una.

Necessites recollir: municipi, situació d'habitatge, situació laboral, ingressos,
situació administrativa (si és immigrant), si té fills o persones a càrrec, i salut.

Quan tinguis suficient informació (mínim municipi + 2 factors de vulnerabilitat),
afegeix al final de la teva resposta exactament aquest tag: [READY_TO_MATCH]

Respon sempre en català, de forma càlida i propera. Màxim 2 frases per resposta."""

SYSTEM_VOLUNTARI = """Ets un assistent de Càritas Diocesana de Tarragona que ajuda
a trobar el projecte de voluntariat ideal per a cada persona.

Fes preguntes d'una en una per recollir:
1. Municipi on viu
2. Disponibilitat horària EXACTA (matins/tardes/caps de setmana/dies concrets)
3. Habilitats o formació professional
4. Motivació per fer voluntariat
5. Gènere (opcional, però important per alguns projectes sensibles)

REGLES IMPORTANTS:
- Si diu que NOMÉS pot els caps de setmana, NO li recomanis projectes entre setmana.
- Si menciona maltractament, violència de gènere o temes sensibles de dona, prioritza
  recomanar voluntàries dones per acompanyament.
- Ordena les recomanacions de més a menys compatible amb la seva disponibilitat.
- Quan tinguis tota la informació afegeix: [READY_TO_MATCH]

Respon sempre en català, de forma càlida i entusiasta. Màxim 2 frases per resposta."""


def build_prompt(system: str, history: list, new_message: str) -> str:
    lines = [system, "\n--- CONVERSA ---"]
    for msg in history:
        role = "Usuari" if msg["role"] == "user" else "Assistent"
        lines.append(f"{role}: {msg['content']}")
    lines.append(f"Usuari: {new_message}")
    lines.append("Assistent:")
    return "\n".join(lines)


def extract_context(history: list, new_message: str) -> str:
    return " ".join([m["content"] for m in history] + [new_message])


@chat_bp.route("/chat/persona", methods=["POST"])
@rate_limited(max_requests=20, window_seconds=60)
def chat_persona():
    data = request.json or {}
    history = data.get("history", [])
    message = data.get("message", "")
    if not message:
        return jsonify({"error": "Cal enviar un missatge"}), 400

    prompt = build_prompt(SYSTEM_PERSONA, history, message)
    response = call_gemini(prompt)
    ready = "[READY_TO_MATCH]" in response
    clean = response.replace("[READY_TO_MATCH]", "").strip()
    result = {"response": clean, "ready": ready, "match": None}

    if ready:
        context = extract_context(history, message)
        keywords = extract_keywords({})
        analysis = analyze_with_gemini({"text_original": context}, keywords)
        match = match_all(
            {"municipi": None, "lat": 41.1189, "lng": 1.2445},
            analysis, keywords
        )
        result["match"] = match

        # Guardem automàticament com a expedient a S3
        try:
            import uuid
            from datetime import datetime
            import boto3
            s3 = boto3.client("s3")
            exp_id = str(uuid.uuid4())[:8]
            expedient = {
                "id": exp_id,
                "font": "chatbot",
                "urgencia": match.get("urgencia", "mitjana"),
                "perfil_resum": match.get("perfil_resum", ""),
                "recursos_assignats": match.get("recursos", []),
                "voluntaris_assignats": match.get("voluntaris", []),
                "empreses_assignades": match.get("empreses", []),
                "centre_assignat": match.get("centre_mes_proper", {}),
                "keywords": match.get("keywords_detectades", []),
                "data_creacio": datetime.utcnow().isoformat(),
                "estat": "actiu"
            }
            bucket = os.getenv("AWS_S3_BUCKET", "hackaton-bucket")
            s3.put_object(
                Bucket=bucket,
                Key=f"expedients/{exp_id}.json",
                Body=json.dumps(expedient, ensure_ascii=False),
                ContentType="application/json"
            )
            create_expedient_record(expedient, created_by_user_id=None)
            increment_assigned_volunteers(expedient.get("voluntaris_assignats", []))
        except Exception:
            pass  # S3 opcional, no bloqueja

    return jsonify(result), 200


@chat_bp.route("/chat/voluntari", methods=["POST"])
@rate_limited(max_requests=20, window_seconds=60)
@require_auth(roles=["voluntari", "treballador"])
def chat_voluntari():
    data = request.json or {}
    history = data.get("history", [])
    message = data.get("message", "")
    if not message:
        return jsonify({"error": "Cal enviar un missatge"}), 400

    prompt = build_prompt(SYSTEM_VOLUNTARI, history, message)
    response = call_gemini(prompt)
    ready = "[READY_TO_MATCH]" in response
    clean = response.replace("[READY_TO_MATCH]", "").strip()
    result = {"response": clean, "ready": ready, "match": None}

    if ready:
        context = extract_context(history, message)
        keywords = extract_keywords({})
        analysis = analyze_with_gemini({"text_original": context}, keywords)
        match = match_all(
            {"municipi": None, "lat": 41.1189, "lng": 1.2445},
            analysis, keywords
        )
        result["match"] = match

    return jsonify(result), 200


@chat_bp.route("/chat/test", methods=["GET"])
def chat_test():
    return jsonify({
        "endpoints": {
            "POST /chat/persona": "Chatbot persona atesa",
            "POST /chat/voluntari": "Chatbot voluntari"
        }
    })