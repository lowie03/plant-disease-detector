# Plant Disease Detector

Upload a photo of a plant leaf and get an AI-assisted diagnosis: the plant, the
condition (or "healthy"), and a confidence score. FastAPI backend running an
ONNX classifier, React frontend, and a two-gate pipeline that refuses to
guess on images that aren't clearly a single plant leaf.

## How it works

`POST /predict` runs an uploaded image through two stages:

1. **Gate 1 — is this a plant?** A pretrained MobileNetV2 (ImageNet) checks
   whether any of the top-5 ImageNet predictions fall into a plant/leaf/fruit
   whitelist. Non-plant images (mugs, screenshots, furniture, etc.) are
   rejected here with `422` before ever reaching the disease classifier.
2. **Gate 2 — what's wrong with it?** A fine-tuned EfficientNet-B0 (38
   classes, trained on the [PlantVillage](https://www.kaggle.com/datasets/emmarex/plantdisease)
   dataset) classifies the leaf. If its top prediction is below 50%
   confidence, the request is also rejected with `422` rather than returning
   a confident-sounding wrong answer.

Both gates run as ONNX models via `onnxruntime` — no PyTorch needed at
inference time.

## Project structure

```
plant-disease-api/
├── app/
│   ├── main.py            # FastAPI app: /health, /classes, /predict
│   └── model_utils.py     # ONNX inference: PlantDiseaseModel, LeafDetector
├── frontend/               # React + Vite + Tailwind UI
│   └── src/
│       ├── App.jsx
│       ├── api/predict.js         # fetch wrapper, normalizes success/warning/error
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── ApiUrlInput.jsx
│       │   ├── ImageUploader.jsx  # dropzone + preview
│       │   ├── ImageCropper.jsx   # crop-to-leaf before uploading
│       │   ├── DiagnoseButton.jsx
│       │   ├── ResultPanel.jsx    # dispatches to Success/Warning/Error
│       │   ├── SuccessResult.jsx
│       │   ├── WarningResult.jsx  # gate rejections
│       │   ├── ErrorResult.jsx    # network/server errors
│       │   ├── ConfidenceBar.jsx
│       │   └── Disclaimer.jsx
│       └── utils/cropImage.js     # canvas crop -> File helper
├── model.onnx               # disease classifier (EfficientNet-B0, 38 classes)
├── class_names.json         # class labels, e.g. "Tomato___Early_blight"
├── mobilenetv2.onnx         # Gate 1 leaf detector (pretrained ImageNet)
├── imagenet_classes.txt     # ImageNet-1k label list for Gate 1
├── best_model.pt            # original PyTorch checkpoint (arch + weights)
├── export_onnx.py           # regenerates model.onnx from best_model.pt
└── requirements.txt
```

## Backend setup

Requires Python 3.12+.

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The server loads `model.onnx` / `class_names.json` (disease classifier) and
`mobilenetv2.onnx` / `imagenet_classes.txt` (leaf gate) at startup. If either
pair is missing, that stage is skipped with a warning — the disease
classifier is required for `/predict` to work at all; the leaf gate is
optional (its absence just means non-leaf images won't be pre-filtered).

### Regenerating model.onnx

`model.onnx` needs to be a self-contained ONNX file. If you ever see an
`onnxruntime` error about a missing `model.onnx.data`, it means the file was
exported with external data enabled. Regenerate it from the checkpoint:

```powershell
pip install torch torchvision onnx --index-url https://download.pytorch.org/whl/cpu
python export_onnx.py
```

These packages aren't in `requirements.txt` since the deployed API only
needs `onnxruntime` for inference — install them only when re-exporting.

## Frontend setup

Requires Node.js. Run all commands from `frontend/`, not the project root.

```powershell
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173`. The API URL is configurable in the UI
(defaults to `http://127.0.0.1:8000`) so the frontend can point at a
locally-run or deployed backend.

> Tailwind CSS is installed at the project root (`package.json` there) and
> resolved by `frontend/vite.config.js` via Node's parent-directory module
> lookup, so also run `npm install` in the project root at least once.

## API reference

| Method | Path       | Description                                  |
|--------|------------|-----------------------------------------------|
| GET    | `/health`  | Liveness check, reports whether the model loaded |
| GET    | `/classes` | List of all 38 supported class labels        |
| POST   | `/predict` | Multipart file upload (`file`), returns diagnosis |

`/predict` responses:

- **200** — `{ plant, condition, is_healthy, confidence, top_predictions[] }`
- **422** — gate rejection (not a plant, or classifier not confident enough); `detail` includes debug predictions
- **400 / 503** — bad file type / model not loaded

## Disclaimer

This is a screening tool, not a diagnostic one. It works best on clear,
well-lit photos of a single leaf on a plain background, and should not
replace expert agricultural advice.
