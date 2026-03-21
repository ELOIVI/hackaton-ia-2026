from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
import re
import uuid

from utils.auth_tokens import sign_auth_token, verify_auth_token
from utils.rate_limit import rate_limited
from utils.user_store import create_user, get_user_by_email, get_user_by_id

auth_bp = Blueprint("auth", __name__)

ALLOWED_ROLES = {"voluntari", "empresa", "treballador"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _extract_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.replace("Bearer ", "", 1).strip()


def _is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email or ""))


@auth_bp.route("/auth/register", methods=["POST"])
@rate_limited(max_requests=20, window_seconds=60)
def register():
    data = request.json or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = str(data.get("role", "")).strip().lower()

    if not email or not password or role not in ALLOWED_ROLES:
        return jsonify({"error": "Cal enviar email, password i role vàlid"}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Format d'email invàlid"}), 400
    if len(password) < 6:
        return jsonify({"error": "La contrasenya ha de tenir almenys 6 caràcters"}), 400

    user_id = str(uuid.uuid4())
    password_hash = generate_password_hash(password)

    created = create_user(
        user_id=user_id,
        email=email,
        password_hash=password_hash,
        role=role,
        nom=data.get("nom"),
        company_name=data.get("companyName"),
        location=data.get("location"),
    )

    if not created:
        return jsonify({"error": "Aquest email ja està registrat"}), 409

    token = sign_auth_token(user_id=user_id, role=role)
    return (
        jsonify(
            {
                "token": token,
                "user": {
                    "id": user_id,
                    "email": email,
                    "role": role,
                    "nom": data.get("nom"),
                    "companyName": data.get("companyName"),
                    "location": data.get("location"),
                },
            }
        ),
        201,
    )


@auth_bp.route("/auth/login", methods=["POST"])
@rate_limited(max_requests=30, window_seconds=60)
def login():
    data = request.json or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Cal enviar email i password"}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Format d'email invàlid"}), 400

    user = get_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Credencials incorrectes"}), 401

    token = sign_auth_token(user_id=user["id"], role=user["role"])
    return jsonify(
        {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "nom": user.get("nom"),
                "companyName": user.get("company_name"),
                "location": user.get("location"),
            },
        }
    )


@auth_bp.route("/auth/me", methods=["GET"])
@rate_limited(max_requests=60, window_seconds=60)
def me():
    token = _extract_bearer_token()
    if not token:
        return jsonify({"error": "Falta token Bearer"}), 401

    payload = verify_auth_token(token)
    if not payload:
        return jsonify({"error": "Token invàlid o expirat"}), 401

    user = get_user_by_id(payload["user_id"])
    if not user:
        return jsonify({"error": "Usuari no trobat"}), 404

    return jsonify(
        {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "nom": user.get("nom"),
                "companyName": user.get("company_name"),
                "location": user.get("location"),
            }
        }
    )
