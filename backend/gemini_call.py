import os
import requests

def call_gemini(prompt: str) -> str:
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")

    url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            timeout=25,
        )
        response.raise_for_status()
        result = response.json()
        
        # Validación de la respuesta
        if "candidates" in result and result["candidates"]:
            return result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise RuntimeError("La respuesta de Gemini no contiene candidatos.")
            
    except requests.RequestException as exc:
        # Esto te dará más detalle si falla la red
        error_detail = response.text if 'response' in locals() else str(exc)
        raise RuntimeError(f"Gemini request failed: {error_detail}") from exc

if __name__ == "__main__":
    # Prueba rápida
    try:
        print(call_gemini("Say hello in one sentence."))
    except Exception as e:
        print(f"Error: {e}")