from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, template_folder="templates")

allow_all_origins = os.getenv("CORS_ALLOW_ALL", "1") == "1"
if allow_all_origins:
    CORS(app, resources={r"/*": {"origins": "*"}})
else:
    frontend_origins = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,https://localhost:3000,https://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]
    CORS(app, resources={r"/*": {"origins": frontend_origins}})

from routes.match import match_bp
from routes.chat import chat_bp
from routes.dashboard import dashboard_bp
from routes.auth import auth_bp
from utils.auth_tokens import ensure_auth_secret_configured
from utils.catalog_cache import warm_catalog_cache
from utils.db_core import initialize_sqlite_db_settings
from utils.user_store import init_user_store, ensure_admin_accounts_all_roles
from utils.expedient_store import init_expedient_store
from utils.partner_store import init_partner_store, seed_partners_if_empty, ensure_partner_admin_entries

app.register_blueprint(match_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(auth_bp)

ensure_auth_secret_configured()
initialize_sqlite_db_settings()
preloaded_catalogs = warm_catalog_cache()
init_user_store()
init_partner_store()
seed_partners_if_empty()
partner_admins = ensure_partner_admin_entries()
init_expedient_store()
admins = ensure_admin_accounts_all_roles()
print(
    f"[AUTH] Admins preparats: treballador={admins['treballador']['email']}, "
    f"voluntari={admins['voluntari']['email']}, empresa={admins['empresa']['email']}"
)
print(f"[PARTNERS] Admins preparats: voluntari={partner_admins['voluntari_admin_id']}, empresa={partner_admins['empresa_admin_id']}")
print(f"[CACHE] Catalegs precarregats: {preloaded_catalogs}")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "servei": "Connector Càritas"})


@app.route("/")
def index():
    return jsonify({
        "missatge": "Connector Càritas API",
        "endpoints": {
            "POST /match": "Motor matching fitxa estructurada",
            "POST /match/text": "Motor matching text lliure",
            "POST /chat/persona": "Chatbot persona atesa",
            "POST /chat/voluntari": "Chatbot voluntari",
            "POST /register/voluntari": "Registre voluntari",
            "POST /register/empresa": "Registre empresa",
            "POST /auth/register": "Registre usuari amb autenticació",
            "POST /auth/login": "Login usuari",
            "GET /auth/me": "Obtenir usuari autenticat",
            "GET /dashboard/voluntari/:id": "Dashboard voluntari",
            "GET /dashboard/empresa/:id": "Dashboard empresa",
            "GET /expedients": "Llista expedients (treballador)",
            "GET /expedients/mine": "Llista expedients creats per mi (treballador)",
            "POST /expedient": "Crear expedient (treballador)",
            "PATCH /expedient/:id/close": "Tancar expedient (treballador)",
        }
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
