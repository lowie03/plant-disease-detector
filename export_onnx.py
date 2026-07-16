"""
export_onnx.py — regenerate model.onnx from best_model.pt.

One-off utility: the committed model.onnx referenced an external weights
file (model.onnx.data) that never made it into this folder. This rebuilds
a single self-contained .onnx from the training checkpoint.

Requires torch + torchvision (not part of the API's runtime requirements.txt
since inference only needs onnxruntime — install them temporarily to run this).
"""

import torch
from torchvision.models import efficientnet_b0

CKPT_PATH = "best_model.pt"
OUT_PATH = "model.onnx"

checkpoint = torch.load(CKPT_PATH, map_location="cpu", weights_only=False)
assert checkpoint["arch"] == "efficientnet_b0"

num_classes = len(checkpoint["class_names"])
img_size = checkpoint["img_size"]

model = efficientnet_b0(weights=None)
model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, num_classes)
model.load_state_dict(checkpoint["model_state"])
model.eval()

dummy_input = torch.randn(1, 3, img_size, img_size)

torch.onnx.export(
    model,
    dummy_input,
    OUT_PATH,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=17,
    dynamo=False,
)

print(f"Wrote {OUT_PATH}")
