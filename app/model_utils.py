"""
model_utils.py — ONNX inference helpers for the plant disease API.

Kept separate from main.py so preprocessing and inference logic can be
tested independently of the FastAPI routing.
"""

import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

# These MUST match the normalization used during training. If you change
# them here without retraining, the model will produce garbage predictions.
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class PlantDiseaseModel:
    def __init__(self, model_path: str, class_names_path: str, img_size: int = 224):
        # CPUExecutionProvider is fine — this is a small model. GPU would be
        # overkill for free-tier deployment.
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.img_size = img_size

        with open(class_names_path) as f:
            self.class_names = json.load(f)

    def preprocess(self, image: Image.Image) -> np.ndarray:
        """Turn a PIL image into the exact tensor shape/values the model expects."""
        image = image.convert("RGB").resize((self.img_size, self.img_size))
        arr = np.array(image, dtype=np.float32) / 255.0        # scale to [0, 1]
        arr = (arr - IMAGENET_MEAN) / IMAGENET_STD              # ImageNet normalize
        arr = arr.transpose(2, 0, 1)                             # HWC -> CHW
        arr = np.expand_dims(arr, axis=0)                        # add batch dim
        return arr.astype(np.float32)

    def softmax(self, logits: np.ndarray) -> np.ndarray:
        # Subtract the max for numerical stability (prevents overflow on huge logits).
        exp = np.exp(logits - np.max(logits))
        return exp / exp.sum()

    def predict(self, image: Image.Image, top_k: int = 3):
        """Full pipeline: preprocess -> ONNX inference -> softmax -> top-k."""
        input_tensor = self.preprocess(image)
        logits = self.session.run(None, {self.input_name: input_tensor})[0][0]
        probs = self.softmax(logits)

        top_indices = np.argsort(probs)[::-1][:top_k]
        return [
            {"label": self.class_names[i], "confidence": float(probs[i])}
            for i in top_indices
        ]


def model_files_exist(model_path: str, class_names_path: str) -> bool:
    return Path(model_path).exists() and Path(class_names_path).exists()


# ImageNet class indices that indicate the image likely contains a plant.
# These come from the standard ImageNet-1k class list. Includes flowers,
# fruits, vegetables, trees, and other plant material. Not perfect — but
# a good enough gate to reject notebooks, mugs, chairs, and other clearly
# non-plant objects.
PLANT_IMAGENET_INDICES = {
    # Fruits
    948,   # Granny Smith (apple)
    949,   # strawberry
    950,   # orange
    951,   # lemon
    952,   # fig
    953,   # pineapple
    954,   # banana
    955,   # jackfruit
    956,   # custard apple
    957,   # pomegranate
    # Vegetables / vegetable-like
    936,   # head cabbage
    937,   # broccoli
    938,   # cauliflower
    939,   # zucchini
    940,   # spaghetti squash
    941,   # acorn squash
    942,   # butternut squash
    943,   # cucumber
    944,   # artichoke
    945,   # bell pepper
    946,   # cardoon
    947,   # mushroom
    987,   # corn
    998,   # ear (of corn)
    # Flowers
    985,   # daisy
    984,   # rapeseed
    # Trees / plants / natural
    988,   # acorn
    989,   # hip (rose hip)
    990,   # buckeye (chestnut)
    991,   # coral fungus
    992,   # agaric (mushroom)
    993,   # gyromitra
    994,   # stinkhorn
    995,   # earthstar
    996,   # hen-of-the-woods
    997,   # bolete
}


class LeafDetector:
    """
    Gate 1: uses pretrained MobileNetV2 (ImageNet) to check whether the
    input image contains something plant-like before we run the disease
    classifier. This filters out paper, mugs, screenshots, and other
    non-plant objects that the disease classifier would otherwise diagnose
    confidently and incorrectly.
    """

    def __init__(self, model_path: str, labels_path: str, img_size: int = 224):
        self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.img_size = img_size

        with open(labels_path) as f:
            self.imagenet_labels = [line.strip() for line in f.readlines()]

    def preprocess(self, image: Image.Image) -> np.ndarray:
        # Same normalization as the disease model — MobileNetV2 was also
        # trained on ImageNet, so it uses the same mean/std.
        image = image.convert("RGB").resize((self.img_size, self.img_size))
        arr = np.array(image, dtype=np.float32) / 255.0
        arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
        arr = arr.transpose(2, 0, 1)
        arr = np.expand_dims(arr, axis=0)
        return arr.astype(np.float32)

    def is_plant(self, image: Image.Image, top_k: int = 5):
        """
        Runs MobileNetV2 and checks if any of the top-k predictions are
        in our plant whitelist.

        Returns (is_plant: bool, top_predictions: list) so main.py can
        return useful debug info if the check fails.
        """
        input_tensor = self.preprocess(image)
        logits = self.session.run(None, {self.input_name: input_tensor})[0][0]

        # Softmax for interpretable probabilities in the response
        exp = np.exp(logits - np.max(logits))
        probs = exp / exp.sum()

        top_indices = np.argsort(probs)[::-1][:top_k]
        top_predictions = [
            {
                "label": self.imagenet_labels[i],
                "confidence": float(probs[i]),
                "is_plant_class": int(i) in PLANT_IMAGENET_INDICES,
            }
            for i in top_indices
        ]

        # If ANY of the top-k predictions is a plant class, we consider it plant-like.
        # top-5 (not top-1) because ImageNet has 1000 classes and even a real leaf
        # might not have "leaf" as its exact top pick — but a plant-like class
        # should show up in the top 5 for actual plant images.
        looks_like_plant = any(p["is_plant_class"] for p in top_predictions)
        return looks_like_plant, top_predictions