"""
Alzheimer's Classification API
Endpoints:
  POST /predict   — upload MRI image → class, confidence, all probs, Grad-CAM heatmap (base64)
  GET  /health    — health check
"""

import io
import base64
import numpy as np
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torchvision import transforms
import timm

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# =============================================================================
# Config
# =============================================================================
MODEL_PATH  = Path("best_vit.pth")
NUM_CLASSES = 4
CLASS_NAMES = [
    "Mild Impairment",
    "Moderate Impairment",
    "No Impairment",
    "Very Mild Impairment",
]
INPUT_SIZE  = 224
MEAN        = [0.485, 0.456, 0.406]
STD         = [0.229, 0.224, 0.225]
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"

# =============================================================================
# Model loading
# =============================================================================
def load_model():
    m = timm.create_model("vit_small_patch16_224", pretrained=False, num_classes=NUM_CLASSES)
    state = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True)
    m.load_state_dict(state)
    m.eval()
    return m.to(DEVICE)

model = load_model()
print(f"Model loaded on {DEVICE}")

# =============================================================================
# Transform
# =============================================================================
preprocess = transforms.Compose([
    transforms.Lambda(lambda img: img.convert("RGB")),
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),
])

# =============================================================================
# Grad-CAM for ViT
# ViT doesn't have conv layers — we hook onto the last attention block's
# output (block[-1]) and use the CLS token attention as the spatial signal.
# This is "Attention Rollout"-style, simpler and more reliable than
# gradient-based CAM for ViTs.
# =============================================================================
class ViTAttentionGradCAM:
    """
    Hooks the last transformer block and computes a spatial attention map
    by averaging attention weights across heads for the CLS token.
    Returns a (14, 14) heatmap (for patch16/224 → 196 patches = 14x14).
    """
    def __init__(self, model: nn.Module):
        self.model       = model
        self.attn_weights = None
        # Disable SDPA (fused attention) on the last block so attn_drop is triggered
        if hasattr(model.blocks[-1].attn, 'fused_attn'):
            model.blocks[-1].attn.fused_attn = False
            
        self._hook       = model.blocks[-1].attn.attn_drop.register_forward_hook(
            self._save_attn
        )

    def _save_attn(self, module, input, output):
        # output shape: (B, heads, seq_len, seq_len)
        self.attn_weights = output.detach()

    def generate(self, tensor: torch.Tensor) -> np.ndarray:
        """
        tensor: (1, 3, 224, 224) already on DEVICE
        Returns: (224, 224) float32 numpy array, values in [0, 1]
        """
        with torch.no_grad():
            _ = self.model(tensor)

        # attn: (1, heads, seq_len, seq_len)
        attn = self.attn_weights[0]          # (heads, seq_len, seq_len)
        # CLS token (index 0) attending to all patch tokens (index 1:)
        cls_attn = attn[:, 0, 1:]            # (heads, 196)
        cls_attn = cls_attn.mean(0)          # (196,) — avg over heads
        cls_attn = cls_attn.cpu().numpy()

        # Reshape to spatial grid
        grid_size = int(cls_attn.shape[0] ** 0.5)   # 14
        heatmap   = cls_attn.reshape(grid_size, grid_size)

        # Normalize to [0, 1]
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        # Upsample to 224x224
        heatmap_img = Image.fromarray((heatmap * 255).astype(np.uint8)).resize(
            (INPUT_SIZE, INPUT_SIZE), resample=Image.BILINEAR
        )
        return np.array(heatmap_img, dtype=np.float32) / 255.0

    def remove(self):
        self._hook.remove()


gradcam = ViTAttentionGradCAM(model)


def overlay_heatmap(original_pil: Image.Image, heatmap: np.ndarray, alpha=0.45) -> str:
    """
    Overlays a heatmap on the original image using a jet colormap.
    Returns base64-encoded PNG string.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    orig = np.array(original_pil.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE)))

    cmap   = plt.get_cmap("jet")
    colored = (cmap(heatmap)[:, :, :3] * 255).astype(np.uint8)   # (224,224,3)

    blended = (alpha * colored + (1 - alpha) * orig).astype(np.uint8)
    result  = Image.fromarray(blended)

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# =============================================================================
# Response schema
# =============================================================================
class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float                        # probability of top class
    probabilities: dict[str, float]          # all 4 class probs
    gradcam_png_b64: str                     # base64 PNG of overlay


# =============================================================================
# App
# =============================================================================
app = FastAPI(title="Alzheimer's MRI Classifier", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # tighten to your frontend domain in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE}


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    # Validate
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(400, "Only JPEG/PNG images accepted.")

    raw = await file.read()
    try:
        img = Image.open(io.BytesIO(raw))
    except Exception:
        raise HTTPException(400, "Could not decode image.")

    tensor = preprocess(img).unsqueeze(0).to(DEVICE)   # (1,3,224,224)

    # Inference
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

    pred_idx    = int(probs.argmax())
    pred_class  = CLASS_NAMES[pred_idx]
    confidence  = float(probs[pred_idx])
    prob_dict   = {cls: float(p) for cls, p in zip(CLASS_NAMES, probs)}

    # Grad-CAM
    heatmap       = gradcam.generate(tensor)
    gradcam_b64   = overlay_heatmap(img, heatmap)

    return PredictionResponse(
        predicted_class=pred_class,
        confidence=confidence,
        probabilities=prob_dict,
        gradcam_png_b64=gradcam_b64,
    )