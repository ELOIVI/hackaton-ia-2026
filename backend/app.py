from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, template_folder="templates")
CORS(app)

from routes.match import match_bp
from routes.chat import chat_bp
from routes.dashboard import dashboard_bp

app.register_blueprint(match_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(dashboard_bp)


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
            "GET /dashboard/voluntari/:id": "Dashboard voluntari",
            "GET /dashboard/empresa/:id": "Dashboard empresa",
            "GET /expedients": "Llista expedients (treballador)",
            "POST /expedient": "Crear expedient (treballador)",
        }
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
