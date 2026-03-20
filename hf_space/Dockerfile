FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app.py .

# Set environment variables
ENV PORT=7860
ENV MODEL_REPO_ID=ELOIVI/sentiment-model

# Expose port
EXPOSE 7860

# Run the application
CMD ["python", "app.py"]
