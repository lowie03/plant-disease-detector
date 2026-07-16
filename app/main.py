"""
main.py — FastAPI backend for the Plant Disease Detector.

Endpoints:
    GET  /health           -> liveness check
    GET  /classes          -> list of all supported class labels
    POST /predict          -> accepts an image file, returns diagnosis + confidence
"""

import io
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from app.model_utils import PlantDiseaseModel, LeafDetector, model_files_exist

# Paths relative to project root (where uvicorn will be run from)
PROJECT_ROOT = Path(__file__).parent.parent
MODEL_PATH = str(PROJECT_ROOT / "model.onnx")
CLASS_NAMES_PATH = str(PROJECT_ROOT / "class_names.json")
LEAF_DETECTOR_PATH = str(PROJECT_ROOT / "mobilenetv2.onnx")
IMAGENET_LABELS_PATH = str(PROJECT_ROOT / "imagenet_classes.txt")
IMG_SIZE = 224

app = FastAPI(
    title="Plant Disease Detector API",
    description="Upload a leaf image to get a disease diagnosis with confidence scores.",
    version="1.0.0",
)

# Allow the browser frontend to call us from anywhere during development.
# Lock this down to your actual frontend origin before public deployment.
# Allow local dev + your deployed Vercel frontend. Add more origins as needed.
# We use a regex to catch Vercel preview deployments (branch-name.vercel.app).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # any Vercel deploy
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

model = None
leaf_detector = None


@app.on_event("startup")
def load_model():
    """Load both models once at startup instead of per-request."""
    global model, leaf_detector

    if not model_files_exist(MODEL_PATH, CLASS_NAMES_PATH):
        print(f"WARNING: disease model files not found. Expected:")
        print(f"  {MODEL_PATH}")
        print(f"  {CLASS_NAMES_PATH}")
        print(f"/predict will return 503 until they exist.")
        return

    model = PlantDiseaseModel(MODEL_PATH, CLASS_NAMES_PATH, img_size=IMG_SIZE)
    print(f"Disease model loaded with {len(model.class_names)} classes.")

    # Load leaf detector (Gate 1). If it's missing, we log a warning and
    # skip the leaf check — the API still works, just without OOD protection.
    if Path(LEAF_DETECTOR_PATH).exists() and Path(IMAGENET_LABELS_PATH).exists():
        leaf_detector = LeafDetector(LEAF_DETECTOR_PATH, IMAGENET_LABELS_PATH, img_size=IMG_SIZE)
        print("Leaf detector (Gate 1) loaded.")
    else:
        print("WARNING: leaf detector files not found. Skipping Gate 1 — API will accept non-leaf images.")


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/classes")
def classes():
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")
    return {"classes": model.class_names}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Make sure model.onnx and class_names.json exist.",
        )

    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Please upload a JPEG, PNG, or WEBP image.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    # --- Gate 1: is this even a plant? ---
    if leaf_detector is not None:
        looks_like_plant, imagenet_top5 = leaf_detector.is_plant(image, top_k=5)
        if not looks_like_plant:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "This doesn't look like a plant leaf. Please upload a clear photo of a single leaf.",
                    "imagenet_top5": [
                        {
                            "label": p["label"],
                            "confidence": round(p["confidence"], 4),
                        }
                        for p in imagenet_top5
                    ],
                },
            )

    # --- Gate 2: disease classifier ---
    results = model.predict(image, top_k=3)
    top = results[0]
    
    # Confidence guard: if the top prediction is weak, the image probably
    # isn't a plant leaf at all (or is a plant the model wasn't trained on).
    # Refuse rather than return a misleading confident-sounding wrong answer.
    CONFIDENCE_THRESHOLD = 0.5
    if top["confidence"] < CONFIDENCE_THRESHOLD:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Could not confidently identify a plant disease in this image. "
                           "Please upload a clear photo of a single leaf, well-lit and filling most of the frame.",
                "top_confidence": round(top["confidence"], 4),
                "top_predictions": [
                    {"label": r["label"], "confidence": round(r["confidence"], 4)}
                    for r in results
                ],
            },
        )

    # Split class labels like "Tomato___Early_blight" into plant + condition
    label_parts = top["label"].split("___")
    plant = label_parts[0].replace("_", " ")
    condition = label_parts[1].replace("_", " ") if len(label_parts) > 1 else "unknown"

    return {
        "plant": plant,
        "condition": condition,
        "is_healthy": condition.lower() == "healthy",
        "confidence": round(top["confidence"], 4),
        "top_predictions": [
            {"label": r["label"], "confidence": round(r["confidence"], 4)} for r in results
        ],
    }