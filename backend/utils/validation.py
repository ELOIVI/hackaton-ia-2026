from typing import Any


def _to_int(value: Any, field_name: str, errors: list[str]) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        errors.append(f"El camp '{field_name}' ha de ser un enter")
        return None


def _to_float(value: Any, field_name: str, errors: list[str]) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        errors.append(f"El camp '{field_name}' ha de ser numèric")
        return None


def validate_fitxa_payload(fitxa: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Validate and normalize core social form fields."""
    normalized = dict(fitxa or {})
    errors: list[str] = []

    edat = _to_int(normalized.get("edat"), "edat", errors)
    if edat is not None:
        if edat < 0:
            errors.append("L'edat no pot ser negativa")
        elif edat > 120:
            errors.append("L'edat sembla invàlida (màxim 120)")
        normalized["edat"] = edat

    menors = _to_int(normalized.get("menors_a_carrec"), "menors_a_carrec", errors)
    if menors is not None:
        if menors < 0:
            errors.append("Els menors a càrrec no poden ser negatius")
        elif menors > 20:
            errors.append("Els menors a càrrec semblen invàlids (màxim 20)")
        normalized["menors_a_carrec"] = menors

    lat = _to_float(normalized.get("lat"), "lat", errors)
    if lat is not None:
        if lat < -90 or lat > 90:
            errors.append("La latitud ha d'estar entre -90 i 90")
        normalized["lat"] = lat

    lng = _to_float(normalized.get("lng"), "lng", errors)
    if lng is not None:
        if lng < -180 or lng > 180:
            errors.append("La longitud ha d'estar entre -180 i 180")
        normalized["lng"] = lng

    return normalized, errors
