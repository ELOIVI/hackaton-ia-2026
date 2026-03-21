# Aquest fitxer és el punt d'entrada HTTP del motor de matching.
# Rep la fitxa social des del formulari web dels companys de frontend,
# executa els tres passos del motor (keywords, Gemini, matcher)
# i retorna el pla de recursos complet en JSON.

from flask import Blueprint, request, jsonify
import json
import os
import logging

from engine.keyword_parser import extract_keywords
from engine.gemini_analyst import analyze_with_gemini
from engine.matcher import match_all
from gemini_call import call_gemini
from utils.json_utils import parse_json_object_from_llm
from utils.rate_limit import rate_limited
from utils.validation import validate_fitxa_payload

match_bp = Blueprint("match", __name__)
logger = logging.getLogger(__name__)


@match_bp.route("/match", methods=["POST"])
@rate_limited(max_requests=30, window_seconds=60)
def match():
    # Esperem un JSON amb els camps de la fitxa social parroquial.
    # Els camps mínims necessaris són: municipi, edat i tipus_habitatge.
    # La resta son opcionals però millorant la precisió del matching.
    fitxa_raw = request.json

    if not fitxa_raw:
        return jsonify({"error": "Cal enviar una fitxa social en format JSON"}), 400

    fitxa, fitxa_errors = validate_fitxa_payload(fitxa_raw)
    if fitxa_errors:
        return jsonify({"error": "Fitxa invàlida", "details": fitxa_errors}), 400

    # Pas 1: extreure keywords deterministes dels camps de la fitxa
    keywords = extract_keywords(fitxa)

    # Pas 2: analitzar el context complet amb Gemini per obtenir prioritats
    analysis = analyze_with_gemini(fitxa, keywords)

    # Pas 3: creuar les necessitats detectades amb les quatre bases de dades
    result = match_all(fitxa, analysis, keywords)

    return jsonify(result), 200


@match_bp.route("/match/test", methods=["GET"])
def match_test():
    # Endpoint de prova que no requereix cap input.
    # Útil per verificar que el motor funciona durant el desenvolupament
    # i per demostrar-lo al jurat sense necessitat del formulari.
    fitxa_demo = {
        "edat": 35,
        "tipus_habitatge": "Infrahabitatge",
        "situacio_laboral": "5",
        "tipus_ingressos": "3",
        "ciutadania": "1",
        "menors_a_carrec": 2,
        "municipi": "Tarragona",
        "lat": 41.1189,
        "lng": 1.2445,
    }
    keywords = extract_keywords(fitxa_demo)
    analysis = analyze_with_gemini(fitxa_demo, keywords)
    result   = match_all(fitxa_demo, analysis, keywords)
    return jsonify(result), 200


@match_bp.route("/match/text", methods=["POST"])
@rate_limited(max_requests=20, window_seconds=60)
def match_text():
    # Aquest endpoint permet al treballador social descriure el cas
    # en text lliure en català, castellà o qualsevol idioma.
    # Gemini s'encarrega d'estructurar la informació abans de passar-la
    # al motor de matching, resolent així la bretxa digital de Càritas.
    data = request.json
    if not data or not data.get("text"):
        return jsonify({"error": "Cal enviar un camp 'text' amb la descripció del cas"}), 400

    text_lliure = data["text"]

    # Demanem a Gemini que extregui els camps de la fitxa del text lliure
    prompt_extractor = f"""
Ets un assistent social expert de Càritas Tarragona.
A partir d'aquesta descripció en llenguatge natural, extreu la informació
rellevant i retorna ÚNICAMENT un JSON amb els camps de la fitxa social.
Si no pots determinar un camp, omit-lo.

DESCRIPCIÓ: {text_lliure}

Retorna ÚNICAMENT aquest JSON sense cap text addicional:
{{
  "edat": null,
  "tipus_habitatge": null,
  "situacio_laboral": null,
  "tipus_ingressos": null,
  "ciutadania": null,
  "menors_a_carrec": 0,
  "municipi": null,
  "lat": 41.1189,
  "lng": 1.2445,
  "addiccions": false,
  "maltractament": false,
  "discapacitat": false,
  "text_original": "{text_lliure}"
}}

Valors possibles per cada camp:
tipus_habitatge: Infrahabitatge, Sense habitatge, Llogada, Rellogada, Ocupada, Propietat
situacio_laboral: 1 (amb contracte), 3 (sense contracte), 5 (aturat inscrit), 6 (aturat no inscrit), 9 (tasques llar)
tipus_ingressos: 3 (sense ingressos), 6 (IMV), 7 (serveis socials), 8 (RGC)
ciutadania: 1 (extracomunitari), 3 (comunitari), 7 (indocumentat), 10 (espanyol)
"""

    try:
        response = call_gemini(prompt_extractor)
        fitxa_raw = parse_json_object_from_llm(response)
    except Exception:
        logger.exception("Failed to interpret free text in /match/text")
        return jsonify({"error": "El servei d'anàlisi no està disponible temporalment."}), 500

    fitxa, fitxa_errors = validate_fitxa_payload(fitxa_raw)
    if fitxa_errors:
        return jsonify({"error": "Fitxa extreta invàlida", "details": fitxa_errors}), 400

    keywords = extract_keywords(fitxa)
    analysis = analyze_with_gemini(fitxa, keywords)
    result   = match_all(fitxa, analysis, keywords)
    result["fitxa_extreta"] = fitxa

    return jsonify(result), 200


@match_bp.route("/urgency", methods=["POST"])
@rate_limited(max_requests=40, window_seconds=60)
def urgency():
    # Classifica l'urgència d'un text usant el nostre model entrenat a HuggingFace.
    # Complementa Gemini amb ML explicable i quantificable.
    import requests as req
    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "Cal enviar text"}), 400

    hf_endpoint = os.getenv("HF_APP_ENDPOINT", "").rstrip("/")
    if not hf_endpoint:
        return jsonify({"error": "HF_APP_ENDPOINT no configurat"}), 503

    hf_token = os.getenv("HF_API_TOKEN", "").strip()
    headers = {"Content-Type": "application/json"}
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"

    try:
        r = req.post(
            f"{hf_endpoint}/predict",
            json={"text": text},
            headers=headers,
            timeout=15,
        )
        r.raise_for_status()
        return jsonify(r.json()), 200
    except Exception:
        logger.exception("Urgency service failed")
        return jsonify({"error": "El servei d'anàlisi no està disponible temporalment."}), 500
