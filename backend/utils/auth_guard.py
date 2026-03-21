from functools import wraps
from typing import Iterable

from flask import jsonify, request
from flask import g

from utils.auth_tokens import verify_auth_token


def _extract_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.replace("Bearer ", "", 1).strip()


def require_auth(roles: Iterable[str] | None = None):
    allowed_roles = set(roles or [])

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            token = _extract_bearer_token()
            if not token:
                return jsonify({"error": "Falta token Bearer"}), 401

            payload = verify_auth_token(token)
            if not payload:
                return jsonify({"error": "Token invàlid o expirat"}), 401

            role = payload.get("role")
            if allowed_roles and role not in allowed_roles:
                return jsonify({"error": "No autoritzat per aquest recurs"}), 403

            g.auth_payload = payload

            return func(*args, **kwargs)

        return wrapper

    return decorator
