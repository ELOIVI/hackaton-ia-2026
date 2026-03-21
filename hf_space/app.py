# app.py - Deploy this to Hugging Face Spaces
# Install: pip install fastapi uvicorn torch transformers huggingface_hub

from __future__ import annotations

import json
import os
from pathlib import Path
import logging

import torch
import torch.nn as nn
from fastapi import Depends, FastAPI, HTTPException, status
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from transformers import AutoModel, AutoTokenizer

app = FastAPI(title="Urgency Risk Analysis API")
logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Global variables for lazy loading
model = None
tokenizer = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# Model definition (must match training code)
class SentimentClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.bert = AutoModel.from_pretrained("distilbert-base-uncased")
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(768, 2)

    def forward(self, input_ids, attention_mask, **kwargs):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, 0]
        x = self.dropout(pooled)
        return self.classifier(x)


# Request/Response models
class PredictionRequest(BaseModel):
    text: str


class PredictionResponse(BaseModel):
    urgency: str
    confidence: float
    model_signal: str


def _require_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    expected = os.environ.get("HF_API_TOKEN", "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Token de seguretat no configurat.",
        )

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credencials no proporcionades.",
        )

    if credentials.credentials.strip() != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invàlid.",
        )


def _score_urgency_from_text(text: str) -> float:
    lowered = (text or "").lower()
    critical_tokens = [
        "desnon", "al carrer", "sense sostre", "violència", "violencia",
        "maltract", "sense menjar", "no tinc on dormir", "em fan fora",
    ]
    high_tokens = [
        "atur", "sense ingressos", "deute", "deutes", "llum tallada",
        "aigua tallada", "lloguer", "hipoteca", "ansietat", "depress",
    ]
    medium_tokens = [
        "feina precària", "contracte temporal", "ajuda", "orientació", "suport",
    ]

    score = 0.0
    score += 1.6 * sum(1 for t in critical_tokens if t in lowered)
    score += 0.9 * sum(1 for t in high_tokens if t in lowered)
    score += 0.4 * sum(1 for t in medium_tokens if t in lowered)
    return score


def _urgency_label(risk_score: float, model_signal: str) -> tuple[str, float]:
    adjusted = risk_score + (0.25 if model_signal == "negative" else 0.0)
    if adjusted >= 2.0:
        return "alta", min(0.99, 0.55 + min(adjusted / 6.0, 0.44))
    if adjusted >= 0.8:
        return "mitjana", min(0.95, 0.50 + min(adjusted / 6.0, 0.40))
    return "baixa", 0.60


def load_model_from_hf(repo_id: str):
    """Load model from Hugging Face on-demand"""
    global model, tokenizer

    if model is not None:
        return  # Already loaded

    print(f"📥 Loading model from {repo_id}...")

    # Download model files
    cache_dir = "./model_cache"
    Path(cache_dir).mkdir(exist_ok=True)

    model_path = hf_hub_download(
        repo_id=repo_id, filename="model.pt", cache_dir=cache_dir
    )

    config_path = hf_hub_download(
        repo_id=repo_id, filename="config.json", cache_dir=cache_dir
    )

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(repo_id, cache_dir=cache_dir)

    # Load model
    model = SentimentClassifier()
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    print(f"✅ Model loaded successfully on {device}")


@app.on_event("startup")
async def startup_event():
    """Load model when server starts"""
    # Read from environment variable or use default
    REPO_ID = os.environ.get("MODEL_REPO_ID", "ELOIVI/sentiment-model")
    load_model_from_hf(REPO_ID)


@app.get("/")
def root():
    return {
        "message": "Sentiment Analysis API",
        "mode": "urgency-risk",
        "status": "running",
        "endpoints": {
            "/predict": "POST - Analyze sentiment of text",
            "/health": "GET - Check if model is loaded",
            "/docs": "GET - Interactive API documentation",
        },
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(device),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest, _auth: None = Depends(_require_bearer_token)):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Tokenize input
        inputs = tokenizer(
            request.text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        # Get prediction
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs, dim=1)
            prediction = torch.argmax(probs, dim=1).item()
            confidence = probs[0][prediction].item()

        model_signal = "positive" if prediction == 1 else "negative"
        urgency, calibrated = _urgency_label(_score_urgency_from_text(request.text), model_signal)

        # Keep confidence grounded in both model signal and risk heuristic.
        final_confidence = max(float(confidence), float(calibrated))
        return PredictionResponse(
            urgency=urgency,
            confidence=round(final_confidence, 4),
            model_signal=model_signal,
        )

    except Exception:
        logger.exception("Error intern processant urgencia")
        raise HTTPException(status_code=500, detail="Error intern processant la urgència.")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 7860))  # HF Spaces uses port 7860
    print("🚀 Starting API server...")
    uvicorn.run(app, host="0.0.0.0", port=port)
