"""
Gemini Analyst — Pas 2 del motor híbrid
Analitza el context complet de la fitxa i retorna prioritats
"""
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))
from gemini_call import call_gemini


SYSTEM_CONTEXT = """
Ets un assistent social expert de Càritas Diocesana de Tarragona.
La teva funció és analitzar fitxes socials de persones en situació
de vulnerabilitat i determinar les seves necessitats prioritàries
per assignar-los els recursos, voluntaris i organitzacions adequades.

Càritas disposa dels següents tipus de recursos:
- alimentació: ajuda alimentària, cistelles setmanals
- habitatge: ajuda lloguer, mediació, allotjament temporal
- legal: assessoria jurídica immigració, documentació
- inserció_laboral: orientació laboral, CV, formació
- educació: suport escolar infants
- salut_mental: atenció psicosocial, acompanyament
- salut: transport sanitari, acompanyament mèdic
- espècie: roba, equipament llar

Respon SEMPRE en JSON vàlid, sense cap text addicional.
"""


def analyze_with_gemini(fitxa: dict, keywords: list) -> dict:
    """
    Analitza la fitxa amb Gemini i retorna un pla de necessitats.
    """
    prompt = f"""
{SYSTEM_CONTEXT}

FITXA SOCIAL:
{json.dumps(fitxa, ensure_ascii=False, indent=2)}

KEYWORDS DETECTADES AUTOMÀTICAMENT: {keywords}

Analitza aquesta persona i retorna ÚNICAMENT aquest JSON:
{{
  "necessitats_prioritaries": ["tipus1", "tipus2"],
  "urgencia": "alta|mitjana|baixa",
  "perfil_resum": "Descripció breu de la situació en català (màx 2 frases)",
  "consideracions_especials": ["consideració1", "consideració2"],
  "recursos_recomanats_tipus": ["alimentació", "habitatge"],
  "quantitats_recomanades": {{
    "alimentació": 1,
    "habitatge": 1
  }},
  "justificacio": "Explicació breu de per què aquests recursos en català"
}}
"""
    try:
        response = call_gemini(prompt)
        # Neteja la resposta per si Gemini afegeix markdown
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
        return json.loads(response.strip())
    except Exception as e:
        # Fallback si Gemini falla
        return {
            "necessitats_prioritaries": keywords[:3] if keywords else ["alimentació"],
            "urgencia": "mitjana",
            "perfil_resum": "Persona en situació de vulnerabilitat que requereix atenció.",
            "consideracions_especials": [],
            "recursos_recomanats_tipus": keywords[:2] if keywords else ["alimentació"],
            "quantitats_recomanades": {},
            "justificacio": f"Anàlisi automàtica basada en keywords. Error Gemini: {str(e)}"
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
