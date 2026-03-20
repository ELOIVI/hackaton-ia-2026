# Aquest fitxer és el punt d'entrada HTTP del motor de matching.
# Rep la fitxa social des del formulari web dels companys de frontend,
# executa els tres passos del motor (keywords, Gemini, matcher)
# i retorna el pla de recursos complet en JSON.

from flask import Blueprint, request, jsonify
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
