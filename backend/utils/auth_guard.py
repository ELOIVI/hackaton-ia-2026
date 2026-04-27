from functools import wraps
from typing import Iterable
import re

from flask import jsonify, request
from flask import g

from utils.auth_tokens import verify_auth_token


def _extract_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    # Enforce strict Bearer token format to avoid malformed header bypass.
    match = re.match(r"^Bearer\s+([A-Za-z0-9\-_.=]+)$", auth_header)
    return match.group(1) if match else None


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
