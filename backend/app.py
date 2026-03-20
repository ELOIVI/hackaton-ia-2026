from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests, boto3, json, os, uuid
from datetime import datetime
from dotenv import load_dotenv
from gemini_call import call_gemini

load_dotenv()

app = Flask(__name__, template_folder="templates")
CORS(app)

HF_APP_ENDPOINT = os.getenv("HF_APP_ENDPOINT")
AWS_S3_BUCKET   = os.getenv("AWS_S3_BUCKET", "hackaton-bucket")

def analyze_sentiment(text: str) -> dict:
    if not HF_APP_ENDPOINT:
        return {"sentiment": "unavailable", "confidence": 0.0}
    try:
        r = requests.post(f"{HF_APP_ENDPOINT}/predict", json={"text": text}, timeout=15)
        return r.json()
    except Exception as e:
        return {"sentiment": "error", "confidence": 0.0, "detail": str(e)}

def save_to_s3(record: dict):
    try:
        s3 = boto3.client("s3")
        key = f"history/{datetime.utcnow().isoformat()}_{uuid.uuid4().hex[:6]}.json"
        s3.put_object(Bucket=AWS_S3_BUCKET, Key=key, Body=json.dumps(record), ContentType="application/json")
    except Exception:
        pass

def get_history_from_s3(limit=10) -> list:
    try:
        s3 = boto3.client("s3")
        objs = s3.list_objects_v2(Bucket=AWS_S3_BUCKET, Prefix="history/")
        items = sorted(objs.get("Contents", []), key=lambda x: x["LastModified"], reverse=True)[:limit]
        return [json.loads(s3.get_object(Bucket=AWS_S3_BUCKET, Key=i["Key"])["Body"].read()) for i in items]
    except Exception:
        return []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json or {}
    prompt = data.get("prompt", "Genera un comentari aleatori en català")
    return jsonify({"generated_text": call_gemini(prompt)})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text required"}), 400
    sentiment = analyze_sentiment(text)
    record = {"text": text, "sentiment": sentiment, "timestamp": datetime.utcnow().isoformat()}
    save_to_s3(record)
    return jsonify(record)

@app.route("/history")
def history():
    return jsonify(get_history_from_s3())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
EOF