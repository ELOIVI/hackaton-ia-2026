# Aplicació Flask principal del Connector Càritas.
# Integra el motor híbrid de matching (keywords + Gemini + BBDDs)
# i exposa els endpoints que usarà el frontend dels companys.

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, template_folder="templates")
CORS(app)

# Registrem el blueprint del motor de matching
from routes.match import match_bp
app.register_blueprint(match_bp)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "servei": "Connector Càritas"})


@app.route("/")
def index():
    # Redirigim al frontend dels companys o mostrem la pàgina base
    return jsonify({
        "missatge": "Connector Càritas API activa",
        "endpoints": {
            "POST /match": "Motor de matching amb fitxa social completa",
            "GET /match/test": "Test del motor amb fitxa de demostració",
            "GET /health": "Estat del servidor"
        }
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
