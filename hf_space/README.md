---
title: Sentiment Analysis API
emoji: 🎭
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# Sentiment Analysis API

This Space provides a REST API for sentiment analysis using a fine-tuned transformer model.

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /predict` - Analyze sentiment
- `GET /docs` - Interactive API documentation (Swagger UI)

## Usage Example

```bash
curl -X POST "https://YOUR-USERNAME-sentiment-api.hf.space/predict" \
  -H "Content-Type: application/json" \
  -d '{"text": "I love this product!"}'
```

Response:
```json
{
  "sentiment": "positive",
  "confidence": 0.9234
}
```

## Model

This API uses a sentiment classification model trained on [describe your dataset].
Model repository: [link to your model repo]

## Integration

You can call this API from any application:

```javascript
// JavaScript/TypeScript
fetch('https://YOUR-USERNAME-sentiment-api.hf.space/predict', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'Hello world'})
})
.then(r => r.json())
.then(data => console.log(data));
```

```python
# Python
import requests

response = requests.post(
    'https://YOUR-USERNAME-sentiment-api.hf.space/predict',
    json={'text': 'Hello world'}
)
print(response.json())
```
