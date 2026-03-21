"""
Matcher — Pas 3 del motor híbrid
Cruza les necessitats detectades amb les 4 BBDDs
"""
import json
import math
from utils.partner_store import get_voluntaris_for_matching, get_empreses_for_matching
from utils.catalog_cache import get_catalog


def load_db(filename):
    return get_catalog(filename)


def distancia_km(lat1, lng1, lat2, lng2) -> float:
    """Distància aproximada en km entre dos punts"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def keyword_score(item_keywords: list, needed_keywords: list) -> int:
    """Puntuació de coincidència per keywords"""
    return len(set(item_keywords) & set(needed_keywords))


def match_centre(fitxa: dict, centres: list) -> dict | None:
    """Troba el centre Càritas més proper"""
    lat = fitxa.get("lat", 41.1189)
    lng = fitxa.get("lng", 1.2445)
    municipi = fitxa.get("municipi", "").upper()

    # Primer intenta municipi exacte
    for c in centres:
        if municipi and municipi in c.get("municipi", "").upper():
            return c

    # Si no, el més proper per coordenades
    centres_dist = sorted(
        centres,
        key=lambda c: distancia_km(lat, lng, c["lat"], c["lng"])
    )
    return centres_dist[0] if centres_dist else None


def match_recursos(keywords: list, tipus_recomanats: list,
                   quantitats: dict, recursos: list) -> list:
    """Selecciona recursos adequats amb quantitat recomanada"""
    resultat = []
    for rec in recursos:
        score = keyword_score(rec["keywords"], keywords)
        is_recomanat = rec["tipus"] in tipus_recomanats
        if score > 0 or is_recomanat:
            quantitat = quantitats.get(rec["tipus"], 1)
            resultat.append({
                **rec,
                "score": score + (3 if is_recomanat else 0),
                "quantitat_recomanada": min(quantitat, rec["quantitat_disponible"])
            })
    return sorted(resultat, key=lambda x: x["score"], reverse=True)[:4]


def match_voluntaris(keywords: list, fitxa: dict, voluntaris: list) -> list:
    """Selecciona voluntaris disponibles i amb habilitats adequades"""
    lat = fitxa.get("lat", 41.1189)
    lng = fitxa.get("lng", 1.2445)
    resultat = []
    for vol in voluntaris:
        if vol["persones_actuals"] >= vol["max_persones"]:
            continue
        score = keyword_score(vol["habilitats"], keywords)
        if score > 0:
            dist = distancia_km(lat, lng, vol["lat"], vol["lng"])
            resultat.append({
                **vol,
                "score": score,
                "distancia_km": round(dist, 1)
            })
    return sorted(resultat,
                  key=lambda x: (x["score"], -x["distancia_km"]),
                  reverse=True)[:3]


def match_organitzacions(keywords: list, organitzacions: list) -> list:
    """Selecciona organitzacions amb serveis adequats"""
    resultat = []
    for org in organitzacions:
        score = keyword_score(org["keywords"], keywords)
        if score > 0:
            resultat.append({**org, "score": score})
    return sorted(resultat, key=lambda x: x["score"], reverse=True)[:3]


def match_empreses(keywords: list, empreses: list) -> list:
    """Selecciona empreses col·laboradores adequades"""
    resultat = []
    for emp in empreses:
        score = keyword_score(emp["keywords"], keywords)
        if score > 0:
            resultat.append({**emp, "score": score})
    return sorted(resultat, key=lambda x: x["score"], reverse=True)[:2]


def _is_sensitive_case_for_women(analysis: dict, keywords: list, fitxa: dict) -> bool:
    consideracions = [str(c).strip().lower() for c in analysis.get("consideracions_especials", [])]
    keyword_set = {str(k).strip().lower() for k in keywords}
    sensitive_tokens = {
        "tema_sensible_dona",
        "violencia_genere",
        "violència de gènere",
        "maltractament",
        "violencia_domestica",
    }
    fitxa_flag = bool(fitxa.get("tema_sensible_dona") is True)

    return fitxa_flag or any(token in sensitive_tokens for token in consideracions) or any(
        token in sensitive_tokens for token in keyword_set
    )


def _normalize_gender(value: str | None) -> str:
    text = str(value or "").strip().lower()
    if text in {"dona", "f", "female", "mujer"}:
        return "dona"
    if text in {"home", "h", "male", "hombre"}:
        return "home"
    return "desconegut"


def match_all(fitxa: dict, analysis: dict, keywords: list) -> dict:
    """
    Funció principal: retorna el pla complet de recursos
    """
    centres      = load_db("centres.json")
    recursos     = load_db("recursos.json")
    voluntaris   = get_voluntaris_for_matching()
    organitzacions = load_db("organitzacions.json")
    empreses     = get_empreses_for_matching()

    tipus_recomanats  = analysis.get("recursos_recomanats_tipus", [])
    quantitats        = analysis.get("quantitats_recomanades", {})

    voluntaris_assignats = match_voluntaris(keywords, fitxa, voluntaris)
    women_only_policy = _is_sensitive_case_for_women(analysis, keywords, fitxa)
    if women_only_policy:
        voluntaris_assignats = [
            vol for vol in voluntaris_assignats if _normalize_gender(vol.get("genere")) == "dona"
        ]

    return {
        "perfil_resum":            analysis.get("perfil_resum", ""),
        "urgencia":                analysis.get("urgencia", "mitjana"),
        "necessitats_prioritaries": analysis.get("necessitats_prioritaries", []),
        "justificacio":            analysis.get("justificacio", ""),
        "consideracions_especials": analysis.get("consideracions_especials", []),
        "centre_mes_proper":       match_centre(fitxa, centres),
        "recursos":                match_recursos(keywords, tipus_recomanats, quantitats, recursos),
        "voluntaris":              voluntaris_assignats,
        "organitzacions":          match_organitzacions(keywords, organitzacions),
        "empreses":                match_empreses(keywords, empreses),
        "keywords_detectades":     keywords,
        "inclusion_policy_applied": {
            "women_only_sensitive_case": women_only_policy,
            "rule": "Si el cas es sensible per violencia de genere o maltractament, nomes s'assignen voluntaries dones.",
        },
    }


if __name__ == "__main__":
    from keyword_parser import extract_keywords
    from gemini_analyst import analyze_with_gemini

    fitxa_test = {
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

    kw       = extract_keywords(fitxa_test)
    analysis = analyze_with_gemini(fitxa_test, kw)
    result   = match_all(fitxa_test, analysis, kw)

    print(json.dumps(result, ensure_ascii=False, indent=2))