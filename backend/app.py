# Aplicació Flask principal del Connector Càritas.
# Integra el motor híbrid de matching i els chatbots guiats per Gemini.

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, template_folder="templates")
CORS(app)

from routes.match import match_bp
from routes.chat import chat_bp

app.register_blueprint(match_bp)
app.register_blueprint(chat_bp)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "servei": "Connector Càritas"})


@app.route("/")
def index():
    return jsonify({
        "missatge": "Connector Càritas API activa",
        "endpoints": {
            "POST /match": "Motor de matching amb fitxa estructurada",
            "POST /match/text": "Motor de matching amb text lliure",
            "POST /chat/persona": "Chatbot guiat per a persones ateses",
            "POST /chat/voluntari": "Chatbot guiat per a voluntaris",
            "GET /health": "Estat del servidor"
        }
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
