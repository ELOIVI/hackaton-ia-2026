# Aquest mòdul és el cervell del sistema. Usa Gemini per interpretar
# el context complet de la fitxa social i retornar un pla de necessitats
# prioritzat. El context inclou els projectes reals de Càritas perquè
# les recomanacions siguin el més precises possible.

import json
import logging

from gemini_call import call_gemini
from utils.json_utils import parse_json_object_from_llm
from utils.catalog_cache import get_catalog
logger = logging.getLogger(__name__)


KEYWORD_TO_RESOURCE_TYPE = {
    "alimentacio": "alimentació",
    "alimentació": "alimentació",
    "habitatge": "habitatge",
    "sense_llar": "habitatge",
    "desnonament": "habitatge",
    "deutes": "legal",
    "atur": "inserció_laboral",
    "documentacio": "legal",
    "documentació": "legal",
    "salut": "salut",
    "salut_mental": "salut_mental",
    "educacio": "educació",
    "educació": "educació",
}


def _deterministic_resource_types_from_keywords(keywords: list) -> list[str]:
    # Deterministic fallback: derive resource types directly from extracted keywords.
    inferred: list[str] = []
    for keyword in keywords:
        resource_type = KEYWORD_TO_RESOURCE_TYPE.get(str(keyword).strip().lower())
        if resource_type and resource_type not in inferred:
            inferred.append(resource_type)
    return inferred or ["alimentació"]


def _deterministic_urgency_from_keywords(keywords: list) -> str:
    # Deterministic urgency based only on keyword severity buckets.
    normalized = {str(keyword).strip().lower() for keyword in keywords}
    high = {"sense_llar", "desnonament", "violencia_genere", "maltractament", "sense_ingressos"}
    medium = {"deutes", "atur", "habitatge", "alimentacio", "documentacio", "salut"}
    if normalized & high:
        return "alta"
    if normalized & medium:
        return "mitjana"
    return "baixa"


def load_projectes():
    return get_catalog("projectes_caritas.json")


def build_context_projectes(projectes: list) -> str:
    # Construïm un resum llegible dels projectes perquè Gemini
    # els pugui usar com a referència sense saturar el context
    lines = []
    for p in projectes:
        lines.append(
            f"- {p['nom']}: {p['descripcio']} "
            f"(perfil: {p['perfil_beneficiari']})"
        )
    return "\n".join(lines)


def analyze_with_gemini(fitxa: dict, keywords: list) -> dict:
    projectes = load_projectes()
    context_projectes = build_context_projectes(projectes)

    prompt = f"""
Ets un assistent social expert de Càritas Diocesana de Tarragona.
La teva funció és analitzar fitxes socials i assignar recursos de manera
intel·ligent i empàtica.

PROJECTES REALS DE CÀRITAS TARRAGONA:
{context_projectes}

TIPUS DE RECURSOS DISPONIBLES:
alimentació, habitatge, legal, inserció_laboral, educació, salut_mental, salut, espècie

FITXA SOCIAL DE LA PERSONA:
{json.dumps(fitxa, ensure_ascii=False, indent=2)}

KEYWORDS DETECTADES AUTOMÀTICAMENT: {keywords}

Analitza aquesta persona tenint en compte els projectes reals de Càritas
i retorna ÚNICAMENT aquest JSON sense cap text addicional:
{{
  "necessitats_prioritaries": ["tipus1", "tipus2"],
  "urgencia": "alta|mitjana|baixa",
  "perfil_resum": "Descripció breu i empàtica de la situació en català (màx 2 frases)",
  "projectes_recomanats": ["PRJ001", "PRJ004"],
  "consideracions_especials": ["consideració1"],
  "recursos_recomanats_tipus": ["alimentació", "habitatge"],
  "quantitats_recomanades": {{
    "alimentació": 1,
    "habitatge": 1
  }},
  "justificacio": "Explicació breu en català de per què aquests recursos i projectes"
}}
"""
    try:
        response = call_gemini(prompt)
        parsed = parse_json_object_from_llm(response)
        # Validate required keys so partial Gemini JSON does not propagate downstream.
        required_keys = {"necessitats_prioritaries", "urgencia", "perfil_resum"}
        if not required_keys.issubset(parsed.keys()):
            missing = sorted(required_keys.difference(parsed.keys()))
            raise ValueError(f"Missing Gemini keys: {missing}")
        # Observability flag to detect when fallback logic was not used.
        parsed["fallback_used"] = False
        return parsed
    except Exception:
        logger.exception("Gemini analysis failed")
        resource_types = _deterministic_resource_types_from_keywords(keywords)
        return {
            "necessitats_prioritaries": keywords[:3] if keywords else ["alimentació"],
            "urgencia": _deterministic_urgency_from_keywords(keywords),
            "perfil_resum": "Anàlisi deterministic per indisponibilitat temporal del servei IA.",
            "projectes_recomanats": [],
            "consideracions_especials": [],
            "recursos_recomanats_tipus": resource_types,
            "quantitats_recomanades": {},
            "justificacio": "S'ha aplicat matching deterministic basat exclusivament en keywords detectades.",
            "fallback_used": True,
        }


if __name__ == "__main__":
    from keyword_parser import extract_keywords
    fitxa_test = {
        "edat": 35,
        "tipus_habitatge": "Infrahabitatge",
        "situacio_laboral": "5",
        "tipus_ingressos": "3",
        "ciutadania": "1",
        "menors_a_carrec": 2,
        "municipi": "Tarragona",
    }
    kw = extract_keywords(fitxa_test)
    result = analyze_with_gemini(fitxa_test, kw)
    print(json.dumps(result, ensure_ascii=False, indent=2))
