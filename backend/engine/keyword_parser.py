"""
Keyword Parser — Pas 1 del motor híbrid
Extreu keywords deterministes de la fitxa social
"""

# Mapeig directe camps fitxa → keywords
KEYWORD_MAP = {
    "tipus_habitatge": {
        "Infrahabitatge": ["habitatge", "condicions_precàries"],
        "Sense habitatge": ["sense_llar", "urgència_habitatge", "habitatge"],
        "Sense allotjament": ["sense_llar", "urgència_habitatge"],
        "Llogada": ["lloguer", "inestabilitat_habitacional", "habitatge"],
        "Rellogada": ["lloguer", "inestabilitat_habitacional", "habitatge"],
        "Ocupada": ["habitatge", "risc_exclusio"],
    },
    "situacio_laboral": {
        "5": ["atur", "sense_feina"],
        "6": ["atur", "sense_feina"],
        "3": ["economia_submergida", "sense_contracte"],
        "4": ["economia_submergida", "sense_contracte"],
        "9": ["atur", "sense_feina", "cures"],
    },
    "tipus_ingressos": {
        "3": ["sense_ingressos", "pobresa_extrema"],
        "6": ["ingressos_baixos", "imv"],
        "8": ["ingressos_baixos", "rgc"],
        "7": ["ingressos_baixos"],
    },
    "ciutadania": {
        "1": ["extracomunitari", "situació_irregular", "immigració"],
        "4": ["immigració"],
        "5": ["immigració", "situació_irregular"],
        "7": ["indocumentat", "situació_irregular", "urgència_legal"],
        "8": ["situació_irregular"],
        "9": ["situació_irregular"],
    },
    "tipus_malaltia": {
        "Física": ["salut", "malaltia", "discapacitat"],
        "Psíquica": ["salut_mental", "acompanyament_psicològic"],
    },
    "tipus_llar": {
        "Llar monoparental": ["família", "monoparental", "suport_familiar"],
        "Llar unipersonal": ["soledat", "persona_sola"],
        "Sense llar": ["sense_llar", "urgència_habitatge"],
    },
}

# Keywords per rang d'edat
def keywords_per_edat(edat: int) -> list:
    if edat is None:
        return []
    if edat < 18:
        return ["menor", "infants", "protecció_menors"]
    if edat < 30:
        return ["joves", "inserció_laboral"]
    if edat > 65:
        return ["gent_gran", "acompanyament", "salut"]
    return []

# Keywords si té menors a càrrec
def keywords_menors(menors: int) -> list:
    if menors and menors > 0:
        return ["infants", "família", "menors_a_carrec",
                "suport_escolar", "necessitats_bàsiques"]
    return []


def extract_keywords(fitxa: dict) -> list:
    """
    Extreu keywords de la fitxa social.
    fitxa: dict amb camps de la fitxa social parroquial
    retorna: llista de keywords úniques
    """
    keywords = set()

    for camp, valors in KEYWORD_MAP.items():
        valor_fitxa = fitxa.get(camp)
        if valor_fitxa and str(valor_fitxa) in valors:
            keywords.update(valors[str(valor_fitxa)])

    # Edat
    edat = fitxa.get("edat")
    if edat:
        keywords.update(keywords_per_edat(int(edat)))

    # Menors a càrrec
    menors = fitxa.get("menors_a_carrec", 0)
    keywords.update(keywords_menors(menors))

    # Addiccions
    if fitxa.get("addiccions"):
        keywords.update(["addiccions", "salut_mental", "acompanyament_psicològic"])

    # Maltractament
    if fitxa.get("maltractament"):
        keywords.update(["maltractament", "urgència", "protecció"])

    # Discapacitat
    if fitxa.get("discapacitat"):
        keywords.update(["discapacitat", "salut", "mobilitat"])

    return list(keywords)


if __name__ == "__main__":
    # Test
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
    print("Keywords detectades:", kw)
