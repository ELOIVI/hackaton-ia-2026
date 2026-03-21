import os
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired


def _get_secret_key() -> str:
    return os.getenv("AUTH_SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret-change-me"


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(secret_key=_get_secret_key(), salt="caritas-auth")


def sign_auth_token(user_id: str, role: str) -> str:
    return _serializer().dumps({"user_id": user_id, "role": role})


def verify_auth_token(token: str, max_age_seconds: int = 60 * 60 * 12) -> dict | None:
    try:
        data = _serializer().loads(token, max_age=max_age_seconds)
        if isinstance(data, dict) and data.get("user_id") and data.get("role"):
            return data
        return None
    except (BadSignature, SignatureExpired):
        return None
