import os
import time
import requests


class GeminiCallError(RuntimeError):
    """Structured upstream error for Gemini calls.

    client_message is safe to return to API clients.
    log_detail is intended for server-side logs only.
    """

    def __init__(
        self,
        *,
        kind: str,
        client_message: str,
        status_code: int,
        retry_after_seconds: int | None = None,
        log_detail: str | None = None,
    ) -> None:
        super().__init__(log_detail or client_message)
        self.kind = kind
        self.client_message = client_message
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds
        self.log_detail = log_detail or client_message


    _gemini_circuit_open_until: float = 0.0


def _gemini_timeout_seconds() -> int:
    # Timeout is configurable to avoid hardcoded network behavior.
    raw = os.getenv("GEMINI_TIMEOUT_SECONDS", "25").strip()
    try:
        timeout = int(raw)
    except ValueError:
        timeout = 25
    return max(3, min(timeout, 120))


def _parse_retry_after_seconds(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except (TypeError, ValueError):
        return None


def _raise_for_http_status(response: requests.Response) -> None:
    status = int(response.status_code)
    if status < 400:
        return

    retry_after = _parse_retry_after_seconds(response.headers.get("Retry-After"))
    body_preview = (response.text or "")[:500]

    # 429: explicit quota/rate-limit signal with optional retry-after.
    if status == 429:
        # Open a short circuit to avoid hammering the upstream on quota errors.
        cooldown = retry_after or 30
        global _gemini_circuit_open_until
        _gemini_circuit_open_until = max(_gemini_circuit_open_until, time.time() + cooldown)
        raise GeminiCallError(
            kind="rate_limited",
            client_message="El servei IA està temporalment saturat.",
            status_code=429,
            retry_after_seconds=retry_after,
            log_detail=f"Gemini rate-limited (429). body={body_preview}",
        )

    # 400 with invalid key payload: Gemini reports auth/config issues as bad request.
    body_lower = (response.text or "").lower()
    if status == 400 and ("api key" in body_lower or "apikey" in body_lower or "invalid argument" in body_lower):
        raise GeminiCallError(
            kind="auth",
            client_message="El servei IA no està configurat correctament.",
            status_code=503,
            log_detail=f"Gemini auth-like bad request (400). body={body_preview}",
        )

    # 401/403: invalid or missing credentials upstream.
    if status in {401, 403}:
        raise GeminiCallError(
            kind="auth",
            client_message="El servei IA no està configurat correctament.",
            status_code=503,
            log_detail=f"Gemini auth error ({status}). body={body_preview}",
        )

    # Other upstream failures.
    raise GeminiCallError(
        kind="upstream",
        client_message="El servei IA no està disponible temporalment.",
        status_code=503,
        log_detail=f"Gemini upstream HTTP {status}. body={body_preview}",
    )


def call_gemini(prompt: str) -> str:
    now = time.time()
    if now < _gemini_circuit_open_until:
        retry_after = max(1, int(_gemini_circuit_open_until - now))
        raise GeminiCallError(
            kind="rate_limited",
            client_message="El servei IA està temporalment saturat.",
            status_code=429,
            retry_after_seconds=retry_after,
            log_detail="Gemini circuit breaker open",
        )

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        # Missing API key is treated as auth/config error with safe client message.
        raise GeminiCallError(
            kind="auth",
            client_message="El servei IA no està configurat correctament.",
            status_code=503,
            log_detail="GOOGLE_API_KEY not found",
        )

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            timeout=_gemini_timeout_seconds(),
        )
        _raise_for_http_status(response)
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except GeminiCallError:
        raise
    except requests.Timeout as exc:
        raise GeminiCallError(
            kind="timeout",
            client_message="El servei IA està trigant massa a respondre.",
            status_code=504,
            log_detail=f"Gemini timeout: {exc}",
        ) from exc
    except requests.RequestException as exc:
        raise GeminiCallError(
            kind="network",
            client_message="No s'ha pogut connectar amb el servei IA.",
            status_code=503,
            log_detail=f"Gemini network error: {exc}",
        ) from exc
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise GeminiCallError(
            kind="invalid_response",
            client_message="El servei IA ha retornat una resposta invàlida.",
            status_code=502,
            log_detail=f"Gemini response parse error: {exc}",
        ) from exc


if __name__ == "__main__":
    print(call_gemini("Say hello in one sentence."))
