# Lightweight serving image — CPU only, no torch, no CUDA.
# Two ONNX models load in memory (~35MB total), so the image stays small.
FROM python:3.12-slim

WORKDIR /code

# System deps needed by Pillow for JPEG/PNG decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (better layer caching — deps change less than code)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code and model files
COPY app/ ./app/
COPY model.onnx .
COPY mobilenetv2.onnx .
COPY class_names.json .
COPY imagenet_classes.txt .

# Render sets the PORT env var — we bind to whatever they give us
ENV PORT=8000
EXPOSE 8000

# Use shell form so $PORT gets expanded properly
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT