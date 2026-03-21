import json
from typing import Any


def parse_json_object_from_llm(raw_text: str) -> dict[str, Any]:
    """Parse a JSON object from noisy LLM output.

    Accepts plain JSON, fenced markdown JSON, and responses with extra prose.
    Raises ValueError if a valid JSON object cannot be extracted.
    """
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Resposta buida del model")

    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1].strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()

    # First attempt: direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Second attempt: extract substring between first '{' and last '}'
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("No s'ha pogut extreure un JSON objecte vàlid")
