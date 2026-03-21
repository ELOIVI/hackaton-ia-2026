from flask import Blueprint, request, jsonify
import json
import os
import re
import uuid
import logging
from datetime import datetime
from functools import lru_cache
import boto3

from gemini_call import call_gemini
from engine.keyword_parser import extract_keywords
from engine.gemini_analyst import analyze_with_gemini
from engine.matcher import match_all
from utils.rate_limit import rate_limited
from utils.auth_guard import require_auth
from utils.volunteer_load import increment_assigned_volunteers
from utils.expedient_store import create_expedient_record
from utils.json_utils import parse_json_object_from_llm

chat_bp = Blueprint("chat", __name__)
logger = logging.getLogger(__name__)

MUNICIPI_COORDS = {
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
}

SYSTEM_PERSONA = """Ets un assistent social empàtic de Càritas Diocesana de Tarragona.
La teva missió és recollir informació sobre la situació de la persona per connectar-la
amb els recursos adequats. Fes preguntes clares i amables, d'una en una.

Necessites recollir: municipi, situació d'habitatge, situació laboral, ingressos,
situació administrativa (si és immigrant), si té fills o persones a càrrec, i salut.

Retorna SEMPRE i només un JSON objecte amb aquest format:
{
    "resposta": "text en català per a la persona",
    "ready_to_match": true o false,
    "municipi_detectat": "Nom del municipi o buit"
}

No afegeixis cap text fora del JSON."""

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

Retorna SEMPRE i només un JSON objecte amb aquest format:
{
    "resposta": "text en català per al voluntari",
    "ready_to_match": true o false,
    "municipi_detectat": "Nom del municipi o buit"
}

No afegeixis cap text fora del JSON."""


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


@lru_cache(maxsize=1)
def _municipi_regex() -> re.Pattern[str]:
    joined = "|".join(sorted((re.escape(k) for k in MUNICIPI_COORDS.keys()), key=len, reverse=True))
    return re.compile(rf"\b({joined})\b", re.IGNORECASE)


def infer_fitxa_from_text(history: list, message: str, detected_municipi: str | None) -> dict:
    context = extract_context(history, message)
    muni = (detected_municipi or "").strip()

    if not muni:
        match = _municipi_regex().search(context)
        if match:
            for name in MUNICIPI_COORDS:
                if name.lower() == match.group(1).lower():
                    muni = name
                    break

    lat, lng = MUNICIPI_COORDS.get(muni, MUNICIPI_COORDS["Tarragona"])
    return {
        "municipi": muni or "Tarragona",
        "lat": lat,
        "lng": lng,
        "text_original": context,
    }


def _safe_chat_payload(raw_response: str) -> tuple[str, bool, str | None]:
    try:
        parsed = parse_json_object_from_llm(raw_response)
        response_text = str(parsed.get("resposta", "")).strip()
        ready = bool(parsed.get("ready_to_match", False))
        municipi = str(parsed.get("municipi_detectat", "")).strip() or None
        return response_text, ready, municipi
    except Exception:
        logger.exception("No s'ha pogut parsejar JSON estructurat del chat")
        return "No he pogut interpretar correctament la resposta. Pots reformular-ho?", False, None


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
    clean, ready, municipi_detectat = _safe_chat_payload(response)
    result = {"response": clean, "ready": ready, "match": None}

    if ready:
        fitxa_inferida = infer_fitxa_from_text(history, message, municipi_detectat)
        keywords = extract_keywords(fitxa_inferida)
        analysis = analyze_with_gemini(fitxa_inferida, keywords)
        match = match_all(
            fitxa_inferida,
            analysis, keywords
        )
        result["match"] = match

        try:
            exp_id = str(uuid.uuid4())[:8]
            expedient = {
                "id": exp_id,
                "font": "chatbot",
                "urgencia": match.get("urgencia", "mitjana"),
                "perfil_resum": match.get("perfil_resum", ""),
                "fitxa": fitxa_inferida,
                "recursos_assignats": match.get("recursos", []),
                "voluntaris_assignats": match.get("voluntaris", []),
                "empreses_assignades": match.get("empreses", []),
                "centre_assignat": match.get("centre_mes_proper", {}),
                "keywords": match.get("keywords_detectades", []),
                "data_creacio": datetime.utcnow().isoformat(),
                "estat": "actiu"
            }
            create_expedient_record(expedient, created_by_user_id=None)
            increment_assigned_volunteers(expedient.get("voluntaris_assignats", []))
        except Exception:
            logger.exception("Error guardant expedient chatbot")
            return jsonify({"error": "No s'ha pogut guardar l'expedient generat"}), 500

        try:
            bucket = os.getenv("AWS_S3_BUCKET", "hackaton-bucket")
            s3 = boto3.client("s3")
            s3.put_object(
                Bucket=bucket,
                Key=f"expedients/{exp_id}.json",
                Body=json.dumps(expedient, ensure_ascii=False),
                ContentType="application/json"
            )
        except Exception:
            logger.exception("Error fent mirall S3 de l'expedient %s", exp_id)

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
    clean, ready, municipi_detectat = _safe_chat_payload(response)
    result = {"response": clean, "ready": ready, "match": None}

    if ready:
        fitxa_inferida = infer_fitxa_from_text(history, message, municipi_detectat)
        keywords = extract_keywords(fitxa_inferida)
        analysis = analyze_with_gemini(fitxa_inferida, keywords)
        match = match_all(
            fitxa_inferida,
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