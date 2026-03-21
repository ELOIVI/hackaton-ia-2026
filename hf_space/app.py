# app.py - Deploy this to Hugging Face Spaces
# Install: pip install fastapi uvicorn torch transformers huggingface_hub

from __future__ import annotations

import json
import os
from pathlib import Path
import logging
import re
from functools import lru_cache

import torch
import torch.nn as nn
from fastapi import Depends, FastAPI, HTTPException, status
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from transformers import AutoModel, AutoModelForSequenceClassification, AutoTokenizer

app = FastAPI(title="Urgency Risk Analysis API")
logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Global variables for lazy loading
model = None
tokenizer = None
model_mode = "legacy_binary"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MAX_TEXT_LENGTH = 2000

CRITICAL_TOKENS = [
    "desnon", "al carrer", "sense sostre", "violència", "violencia",
    "maltract", "sense menjar", "no tinc on dormir", "em fan fora",
]
HIGH_TOKENS = [
    "atur", "sense ingressos", "deute", "deutes", "llum tallada",
    "aigua tallada", "lloguer", "hipoteca", "ansietat", "depress",
]
MEDIUM_TOKENS = [
    "feina precària", "contracte temporal", "ajuda", "orientació", "suport",
]
NEGATION_TERMS = {"no", "sense", "cap"}


# Model definition (must match training code)
class SentimentClassifier(nn.Module):
    def __init__(self, backbone_model_name: str):
        super().__init__()
        self.bert = AutoModel.from_pretrained(backbone_model_name)
        self.dropout = nn.Dropout(0.3)
        hidden_size = int(getattr(self.bert.config, "hidden_size", 768))
        self.classifier = nn.Linear(hidden_size, 2)

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


@lru_cache(maxsize=512)
def _cached_term_pattern(term: str) -> re.Pattern[str]:
    tokenized = re.escape(term).replace(r"\ ", r"\s+")
    return re.compile(r"\b" + tokenized + r"\b", re.IGNORECASE)


@lru_cache(maxsize=1)
def _token_word_pattern() -> re.Pattern[str]:
    return re.compile(r"\w+", re.UNICODE)


def _contains_term(text: str, term: str) -> bool:
    return bool(_cached_term_pattern(term).search(text))


def _is_negated_text(text: str, term: str, window: int = 3) -> bool:
    term_words = _token_word_pattern().findall(term.lower())
    text_words = _token_word_pattern().findall(text.lower())
    if not term_words or not text_words:
        return False

    n = len(term_words)
    for i in range(0, max(0, len(text_words) - n + 1)):
        if text_words[i:i + n] == term_words:
            start = max(0, i - window)
            if any(w in NEGATION_TERMS for w in text_words[start:i]):
                return True
    return False


def _score_urgency_from_text(text: str) -> float:
    lowered = (text or "").lower()

    score = 0.0
    score += 1.6 * sum(1 for t in CRITICAL_TOKENS if _contains_term(lowered, t) and not _is_negated_text(lowered, t))
    score += 0.9 * sum(1 for t in HIGH_TOKENS if _contains_term(lowered, t) and not _is_negated_text(lowered, t))
    score += 0.4 * sum(1 for t in MEDIUM_TOKENS if _contains_term(lowered, t) and not _is_negated_text(lowered, t))
    return score


def _urgency_label(risk_score: float, model_signal: str) -> tuple[str, float]:
    adjusted = risk_score + (0.25 if model_signal == "negative" else 0.0)
    if adjusted >= 2.0:
        return "alta", min(0.99, 0.55 + min(adjusted / 6.0, 0.44))
    if adjusted >= 0.8:
        return "mitjana", min(0.95, 0.50 + min(adjusted / 6.0, 0.40))
    return "baixa", 0.60


def _normalize_hf_label(label: str) -> str:
    value = str(label or "").strip().lower()
    if any(token in value for token in ("negative", "negatiu", "negativo", "label_0")):
        return "negative"
    if any(token in value for token in ("positive", "positiu", "positivo", "label_2")):
        return "positive"
    return "neutral"


def load_model_from_hf(repo_id: str):
    """Load model from Hugging Face on-demand"""
    global model, tokenizer, model_mode

    if model is not None:
        return  # Already loaded

    print(f"📥 Loading model from {repo_id}...")

    # Download model files
    cache_dir = "./model_cache"
    Path(cache_dir).mkdir(exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(repo_id, cache_dir=cache_dir)

    try:
        model_path = hf_hub_download(
            repo_id=repo_id, filename="model.pt", cache_dir=cache_dir
        )

        backbone_model_name = os.environ.get(
            "MODEL_BACKBONE",
            "distilbert-base-uncased",
        )
        model = SentimentClassifier(backbone_model_name)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model_mode = "legacy_binary"
    except Exception:
        logger.warning("No s'ha trobat model.pt; usant AutoModelForSequenceClassification", exc_info=True)
        model = AutoModelForSequenceClassification.from_pretrained(repo_id, cache_dir=cache_dir)
        model_mode = "hf_sequence"

    model.to(device)
    model.eval()

    print(f"✅ Model loaded successfully on {device}")


@app.on_event("startup")
async def startup_event():
    """Load model when server starts"""
    # Read from environment variable or use default
    REPO_ID = os.environ.get("MODEL_REPO_ID", "cardiffnlp/twitter-xlm-roberta-base-sentiment")
    load_model_from_hf(REPO_ID)


@app.get("/")
def root():
    return {
        "message": "Urgency Risk Analysis API",
        "mode": "urgency-risk",
        "status": "running",
        "endpoints": {
            "/predict": "POST - Analyze urgency risk of text",
            "/health": "GET - Check if model is loaded",
            "/docs": "GET - Interactive API documentation",
        },
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_mode": model_mode,
        "device": str(device),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest, _auth: None = Depends(_require_bearer_token)):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if len(request.text or "") > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="Text massa llarg")

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
            logits = outputs if isinstance(outputs, torch.Tensor) else outputs.logits
            probs = torch.softmax(logits, dim=1)
            prediction = torch.argmax(probs, dim=1).item()
            confidence = probs[0][prediction].item()

        if model_mode == "legacy_binary":
            model_signal = "positive" if prediction == 1 else "negative"
        else:
            id2label = getattr(getattr(model, "config", None), "id2label", {}) or {}
            label = id2label.get(prediction, str(prediction))
            model_signal = _normalize_hf_label(str(label))

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
