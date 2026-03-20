# Aquest endpoint gestiona la conversa guiada del chatbot de Càritas.
# Gemini condueix el diàleg de forma dinàmica, fent preguntes adaptades
# a cada persona fins que té prou informació per fer el matching complet.
# Rep l'historial de conversa i retorna la resposta de Gemini més,
# si ja té prou dades, el pla de recursos complet.

from flask import Blueprint, request, jsonify
import json, sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))

from gemini_call import call_gemini
from engine.keyword_parser import extract_keywords
from engine.gemini_analyst import analyze_with_gemini
from engine.matcher import match_all

chat_bp = Blueprint("chat", __name__)

# Prompt de sistema per al mode persona atesa
SYSTEM_PERSONA = """Ets un assistent social empàtic de Càritas Diocesana de Tarragona.
La teva missió és recollir informació sobre la situació de la persona per connectar-la
amb els recursos adequats. Fes preguntes clares i amables, d'una en una.

Necessites recollir: municipi, situació d'habitatge, situació laboral, ingressos,
situació administrativa (si és immigrant), si té fills o persones a càrrec, i salut.

Quan tinguis suficient informació (mínim municipi + 2 factors de vulnerabilitat),
afegeix al final de la teva resposta exactament aquest tag: [READY_TO_MATCH]

Respon sempre en català, de forma càlida i propera. Màxim 2 frases per resposta."""

# Prompt de sistema per al mode voluntari
SYSTEM_VOLUNTARI = """Ets un assistent de Càritas Diocesana de Tarragona que ajuda
a trobar el projecte de voluntariat ideal per a cada persona.
Fes preguntes d'una en una per recollir: municipi, disponibilitat horària,
habilitats o formació, i motivació per fer voluntariat.

Quan tinguis tota aquesta informació, afegeix al final: [READY_TO_MATCH]

Respon sempre en català, de forma càlida i entusiasta. Màxim 2 frases per resposta."""


def build_conversation_prompt(system: str, history: list, new_message: str) -> str:
    # Construïm el prompt amb tot l'historial per mantenir el context
    lines = [system, "\n--- CONVERSA ---"]
    for msg in history:
        role = "Usuari" if msg["role"] == "user" else "Assistent"
        lines.append(f"{role}: {msg['content']}")
    lines.append(f"Usuari: {new_message}")
    lines.append("Assistent:")
    return "\n".join(lines)


def extract_context_from_history(history: list, new_message: str) -> str:
    # Construïm un text complet amb tota la conversa per passar al motor
    all_text = " ".join([m["content"] for m in history] + [new_message])
    return all_text


@chat_bp.route("/chat/persona", methods=["POST"])
def chat_persona():
    # Chatbot per a persones que necessiten ajuda de Càritas
    data = request.json or {}
    history = data.get("history", [])
    message = data.get("message", "")

    if not message:
        return jsonify({"error": "Cal enviar un missatge"}), 400

    prompt = build_conversation_prompt(SYSTEM_PERSONA, history, message)
    response = call_gemini(prompt)

    # Comprovem si Gemini considera que ja té prou informació
    ready = "[READY_TO_MATCH]" in response
    clean_response = response.replace("[READY_TO_MATCH]", "").strip()

    result = {"response": clean_response, "ready": ready, "match": None}

    if ready:
        # Fem el matching amb tot el context de la conversa
        context = extract_context_from_history(history, message)
        keywords = extract_keywords({})
        analysis = analyze_with_gemini({"text_original": context}, keywords)
        match_result = match_all(
            {"municipi": None, "lat": 41.1189, "lng": 1.2445},
            analysis, keywords
        )
        result["match"] = match_result

    return jsonify(result), 200


@chat_bp.route("/chat/voluntari", methods=["POST"])
def chat_voluntari():
    # Chatbot per a persones que volen fer voluntariat a Càritas
    data = request.json or {}
    history = data.get("history", [])
    message = data.get("message", "")

    if not message:
        return jsonify({"error": "Cal enviar un missatge"}), 400

    prompt = build_conversation_prompt(SYSTEM_VOLUNTARI, history, message)
    response = call_gemini(prompt)

    ready = "[READY_TO_MATCH]" in response
    clean_response = response.replace("[READY_TO_MATCH]", "").strip()

    result = {"response": clean_response, "ready": ready, "match": None}

    if ready:
        context = extract_context_from_history(history, message)
        keywords = extract_keywords({})
        analysis = analyze_with_gemini({"text_original": context}, keywords)
        match_result = match_all(
            {"municipi": None, "lat": 41.1189, "lng": 1.2445},
            analysis, keywords
        )
        result["match"] = match_result

    return jsonify(result), 200


@chat_bp.route("/chat/test", methods=["GET"])
def chat_test():
    # Endpoint de prova per verificar que el chatbot funciona
    return jsonify({
        "endpoints": {
            "POST /chat/persona": "Chatbot per a persones que necessiten ajuda",
            "POST /chat/voluntari": "Chatbot per a voluntaris"
        },
        "format_request": {
            "history": [
                {"role": "user", "content": "Hola"},
                {"role": "assistant", "content": "Hola! En quin municipi vius?"}
            ],
            "message": "Visc a Tarragona"
        }
    })
