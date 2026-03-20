# Aquest fitxer és el punt d'entrada HTTP del motor de matching.
# Rep la fitxa social des del formulari web dels companys de frontend,
# executa els tres passos del motor (keywords, Gemini, matcher)
# i retorna el pla de recursos complet en JSON.

from flask import Blueprint, request, jsonify
import json
import sys, os

# Afegim el directori backend/ al path per poder importar els mòduls del motor
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))

from engine.keyword_parser import extract_keywords
from engine.gemini_analyst import analyze_with_gemini
from engine.matcher import match_all

match_bp = Blueprint("match", __name__)


@match_bp.route("/match", methods=["POST"])
def match():
    # Esperem un JSON amb els camps de la fitxa social parroquial.
    # Els camps mínims necessaris són: municipi, edat i tipus_habitatge.
    # La resta son opcionals però millorant la precisió del matching.
    fitxa = request.json

    if not fitxa:
        return jsonify({"error": "Cal enviar una fitxa social en format JSON"}), 400

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

    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from gemini_call import call_gemini
    from engine.keyword_parser import extract_keywords
    from engine.gemini_analyst import analyze_with_gemini
    from engine.matcher import match_all

    try:
        response = call_gemini(prompt_extractor)
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
        fitxa = json.loads(response.strip())
    except Exception as e:
        return jsonify({"error": f"Error interpretant el text: {str(e)}"}), 500

    keywords = extract_keywords(fitxa)
    analysis = analyze_with_gemini(fitxa, keywords)
    result   = match_all(fitxa, analysis, keywords)
    result["fitxa_extreta"] = fitxa

    return jsonify(result), 200
