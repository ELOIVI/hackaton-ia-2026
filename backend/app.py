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
from utils.user_store import init_user_store, ensure_master_admin
from utils.expedient_store import init_expedient_store
from utils.partner_store import init_partner_store, seed_partners_if_empty

app.register_blueprint(match_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(auth_bp)

init_user_store()
init_partner_store()
seed_partners_if_empty()
init_expedient_store()
master_admin = ensure_master_admin()
print(f"[AUTH] Master admin preparat: {master_admin['email']}")


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
    app.run(host="0.0.0.0", port=5000, debug=True)
