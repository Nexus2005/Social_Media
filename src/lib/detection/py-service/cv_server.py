import os
import base64
import json
import logging
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cv_server")

# ─────────────────────────────────────────────
# Optional dependency guards
# ─────────────────────────────────────────────
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    logger.info("ultralytics (YOLO) is available.")
except Exception as e:
    YOLO_AVAILABLE = False
    logger.warning(f"ultralytics load failed ({e}). YOLO detection disabled — Cloud VLM will be used instead.")

try:
    import easyocr
    OCR_AVAILABLE = True
    logger.info("easyocr is available.")
except Exception as e:
    OCR_AVAILABLE = False
    logger.warning(f"easyocr load failed ({e}). OCR disabled.")

try:
    from pyzbar import pyzbar
    from PIL import Image
    import io as _io
    BARCODE_AVAILABLE = True
    logger.info("pyzbar is available.")
except Exception as e:
    BARCODE_AVAILABLE = False
    logger.warning(f"pyzbar load failed ({e}). Barcode detection disabled.")

try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("OpenCV (cv2) is available.")
except Exception as e:
    CV2_AVAILABLE = False
    logger.warning(f"OpenCV load failed ({e}). Crop quality and scene detection disabled.")

# ─────────────────────────────────────────────
# Global model instances
# ─────────────────────────────────────────────
yolo_openimages = None
yolo_fashionpedia = None
ocr_reader = None
clip_model = None
clip_processor = None

# OpenImages classes
OPENIMAGES_SHOPPABLE = {
    "backpack", "handbag", "suitcase", "umbrella", "tie",
    "cell phone", "laptop", "remote", "keyboard", "mouse", "tv",
    "chair", "couch", "bed", "dining table",
    "bottle", "wine glass", "cup", "bowl", "vase", "clock",
    "book", "scissors",
    "sports ball", "tennis racket", "skateboard", "surfboard",
    "snowboard", "skis", "bicycle", "motorcycle",
    "clothing", "coat", "dress", "earrings", "footwear", "glasses",
    "jacket", "necklace", "shirt", "suit", "sunglasses", "watch", "boot",
    "luggage and bags", "hat", "scarf", "belt"
}

# Fashionpedia classes mapped to standard Cartly labels
FASHIONPEDIA_MAP = {
    0: "Shirt",
    1: "T-Shirt",
    2: "Sweater",
    3: "Cardigan",
    4: "Jacket",
    5: "Vest",
    6: "Pants",
    7: "Shorts",
    8: "Skirt",
    9: "Coat",
    10: "Dress",
    11: "Jumpsuit",
    12: "Cape",
    13: "Sunglasses",
    14: "Hat",
    15: "Hair Accessory",
    16: "Tie",
    17: "Glove",
    18: "Watch",
    19: "Belt",
    20: "Leg Warmer",
    21: "Stockings",
    22: "Socks",
    23: "Shoes",
    24: "Bag",
    25: "Scarf",
    26: "Umbrella"
}

# Known brand words for logo detection
KNOWN_BRANDS = {
    "nike", "adidas", "puma", "reebok", "new balance", "converse",
    "vans", "jordan", "under armour", "champion", "fila",
    "gucci", "louis vuitton", "prada", "versace", "burberry",
    "chanel", "dior", "balenciaga", "givenchy",
    "zara", "h&m", "uniqlo", "gap", "levis", "levi's",
    "apple", "samsung", "sony", "lg", "dell", "hp", "lenovo",
    "asus", "acer", "microsoft", "google", "huawei", "xiaomi",
    "rolex", "casio", "seiko", "tissot", "omega",
    "ray-ban", "oakley", "rayban",
    "jbl", "bose", "beats", "sennheiser", "logitech",
}

# Multi-word brands (check before single-word)
KNOWN_BRANDS_MULTI = [
    "new balance", "under armour", "louis vuitton", "ralph lauren",
    "tommy hilfiger", "calvin klein", "michael kors", "ray-ban",
    "the north face", "north face",
]


def init_models():
    global yolo_openimages, yolo_fashionpedia, ocr_reader

    if YOLO_AVAILABLE:
        try:
            yolo_openimages = YOLO("yolov8n-oiv7.pt")
            logger.info("YOLOv8 Nano OpenImages model loaded.")
        except Exception as e:
            logger.error(f"Failed to load OpenImages model: {e}")

        try:
            onnx_path = "yolov8n-fashionpedia.onnx"
            if os.path.exists(onnx_path):
                yolo_fashionpedia = YOLO(onnx_path)
                logger.info("YOLOv8 Nano Fashionpedia model loaded from ONNX.")
            else:
                logger.warning("yolov8n-fashionpedia.onnx not found. Fashionpedia detector disabled.")
        except Exception as e:
            logger.error(f"Failed to load Fashionpedia model: {e}")

    if OCR_AVAILABLE:
        try:
            ocr_reader = easyocr.Reader(['en'], gpu=False)
            logger.info("EasyOCR Reader loaded.")
        except Exception as e:
            logger.error(f"Failed to load EasyOCR: {e}")


def init_clip():
    global clip_model, clip_processor
    if clip_model is not None:
        return
    try:
        from transformers import CLIPModel, CLIPProcessor
        logger.info("Loading CLIP model 'openai/clip-vit-base-patch32'...")
        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        logger.info("CLIP model loaded successfully!")
    except Exception as e:
        logger.warning(f"Failed to load CLIP model: {e}")


def get_crop_hsv(img, box):
    if img is None:
        return [0.0, 0.0, 0.0]
    try:
        x1, y1, x2, y2 = map(int, box)
        h, w = img.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            return [0.0, 0.0, 0.0]
        hsv_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        h_mean = float(np.mean(hsv_crop[:, :, 0]))
        s_mean = float(np.mean(hsv_crop[:, :, 1]))
        v_mean = float(np.mean(hsv_crop[:, :, 2]))
        return [round(h_mean, 1), round(s_mean, 1), round(v_mean, 1)]
    except Exception:
        return [0.0, 0.0, 0.0]


def get_adaptive_threshold(label, box, frame_w, frame_h):
    # Base threshold
    thresh = 0.25
    
    # Adjust by class category
    label_lower = label.lower()
    # Accessories (high false positives on small areas)
    if label_lower in ["watch", "belt", "tie", "glove", "glasses", "sunglasses", "hair accessory"]:
        thresh = 0.35
    # Shoes and bags
    elif label_lower in ["shoe", "shoes", "bag", "wallet"]:
        thresh = 0.30
    # Large garments
    elif label_lower in ["jacket", "coat", "dress", "suit", "jumpsuit"]:
        thresh = 0.20

    # Adjust by size (relative to frame area)
    x1, y1, x2, y2 = box
    box_area = (x2 - x1) * (y2 - y1)
    frame_area = frame_w * frame_h
    if frame_area > 0:
        rel_area = box_area / frame_area
        if rel_area > 0.15: # Large object
            thresh -= 0.05
        elif rel_area < 0.02: # Tiny object
            thresh += 0.05

    return max(0.15, min(0.50, thresh))



# ─────────────────────────────────────────────
# Crop Quality Assessment
# ─────────────────────────────────────────────
def assess_crop_quality(img_bytes):
    """Assess crop quality using blur, size, brightness, and edge density."""
    if not CV2_AVAILABLE:
        return {"quality": 0.5, "pass": True, "breakdown": {"size": 0.5, "blur": 0.5, "brightness": 0.5, "edges": 0.5}}

    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return {"quality": 0, "pass": False, "breakdown": {"size": 0, "blur": 0, "brightness": 0, "edges": 0}}

    h, w = img.shape[:2]

    # 1. Size — crop must be at least 40×40 pixels
    size_score = min(1.0, (h * w) / (80 * 80))

    # 2. Blur — Laplacian variance (higher = sharper)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(1.0, laplacian_var / 500)

    # 3. Brightness — not too dark, not too bright (0.5 = ideal)
    mean_brightness = np.mean(gray)
    brightness_score = 1.0 - abs(float(mean_brightness) - 127) / 127

    # 4. Edge density — objects have edges
    edges = cv2.Canny(gray, 50, 150)
    edge_score = min(1.0, np.count_nonzero(edges) / (h * w) * 10)

    # Weighted quality score
    quality = (size_score * 0.25 + blur_score * 0.35 +
               brightness_score * 0.15 + edge_score * 0.25)
    quality = round(float(quality), 3)

    return {
        "quality": quality,
        "pass": quality >= 0.35,
        "breakdown": {
            "size": round(float(size_score), 3),
            "blur": round(float(blur_score), 3),
            "brightness": round(float(brightness_score), 3),
            "edges": round(float(edge_score), 3),
        }
    }


# ─────────────────────────────────────────────
# Brand/Logo Detection
# ─────────────────────────────────────────────
def detect_brand(img_bytes):
    """Detect brand/logo from a crop using OCR-based brand word matching."""
    if not OCR_AVAILABLE or not ocr_reader:
        return {"brand": None, "source": None, "confidence": 0.0}

    try:
        results = ocr_reader.readtext(img_bytes)
        words = [r[1].strip() for r in results if r[2] > 0.5]

        # Check multi-word brands first
        full_text = " ".join(words).lower()
        for brand in KNOWN_BRANDS_MULTI:
            if brand in full_text:
                return {"brand": brand.title(), "source": "ocr", "confidence": 0.90}

        # Check single-word brands
        for word in words:
            if word.lower().strip() in KNOWN_BRANDS:
                return {"brand": word.strip(), "source": "ocr", "confidence": 0.85}

        return {"brand": None, "source": None, "confidence": 0.0}
    except Exception as e:
        logger.error(f"[Logo] Brand detection failed: {e}")
        return {"brand": None, "source": None, "confidence": 0.0}


# ─────────────────────────────────────────────
# Visual Attributes Extraction
# ─────────────────────────────────────────────
def extract_attributes(img_bytes):
    """Extract dominant color, brightness, and shape hints from a crop."""
    if not CV2_AVAILABLE:
        return {"color": "unknown", "brightness": "medium", "material": None, "shape": None}

    try:
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return {"color": "unknown", "brightness": "medium", "material": None, "shape": None}

        # Convert to HSV for color detection
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h_mean = np.mean(hsv[:, :, 0])
        s_mean = np.mean(hsv[:, :, 1])
        v_mean = np.mean(hsv[:, :, 2])

        # Determine dominant color from HSV
        color = "unknown"
        if s_mean < 30:
            if v_mean < 60:
                color = "black"
            elif v_mean > 200:
                color = "white"
            else:
                color = "gray"
        elif h_mean < 10 or h_mean > 170:
            color = "red"
        elif h_mean < 25:
            color = "orange"
        elif h_mean < 35:
            color = "yellow"
        elif h_mean < 80:
            color = "green"
        elif h_mean < 130:
            color = "blue"
        elif h_mean < 160:
            color = "purple"
        else:
            color = "pink"

        # Brightness classification
        brightness = "dark" if v_mean < 80 else "bright" if v_mean > 180 else "medium"

        return {
            "color": color,
            "brightness": brightness,
            "material": None,  # Future: texture analysis
            "shape": None,     # Future: contour analysis
        }
    except Exception as e:
        logger.error(f"[Attributes] Extraction failed: {e}")
        return {"color": "unknown", "brightness": "medium", "material": None, "shape": None}


# ─────────────────────────────────────────────
# HTTP Request Handler
# ─────────────────────────────────────────────
class CVRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return  # Suppress noisy HTTP request logs

    def do_GET(self):
        if self.path == '/health':
            self.send_json(200, {
                "status": "ok",
                "capabilities": {
                    "yolo": YOLO_AVAILABLE,
                    "ocr": OCR_AVAILABLE,
                    "barcode": BARCODE_AVAILABLE,
                    "opencv": CV2_AVAILABLE,
                },
                "shoppable_classes": len(SHOPPABLE_CLASSES),
                "known_brands": len(KNOWN_BRANDS),
            })
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            req_body = json.loads(post_data.decode('utf-8'))
            img_b64 = req_body.get('image', '')

            if self.path == '/detect':
                provider = req_body.get('provider', 'openimages')
                self.handle_detect(img_b64, provider)
            elif self.path == '/crop-quality':
                self.handle_crop_quality(img_b64)
            elif self.path == '/logo-detect':
                self.handle_logo_detect(img_b64)
            elif self.path == '/ocr-crop':
                self.handle_ocr_crop(img_b64, req_body.get('knownBrand'))
            elif self.path == '/barcode-crop':
                self.handle_barcode_crop(img_b64)
            elif self.path == '/attributes':
                self.handle_attributes(img_b64)
            elif self.path == '/clip-similarity':
                self.handle_clip_similarity(req_body)
            else:
                self.send_response(404)
                self.end_headers()

        except Exception as e:
            logger.exception("Request processing failed")
            self.send_json(500, {"error": str(e)})

    # ─── /detect — YOLO detection (shoppable classes only) ─────────────

    def handle_detect(self, img_b64, provider='openimages'):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return

        img_bytes = base64.b64decode(img_b64)
        objects, debug_info = self._detect_and_debug(img_bytes, provider)
        self.send_json(200, {"objects": objects, "debug": debug_info})

    # ─── /crop-quality — Assess crop quality ───────────────────────────

    def handle_crop_quality(self, img_b64):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return
        img_bytes = base64.b64decode(img_b64)
        result = assess_crop_quality(img_bytes)
        self.send_json(200, result)

    # ─── /logo-detect — Brand/logo recognition (BEFORE OCR) ───────────

    def handle_logo_detect(self, img_b64):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return
        img_bytes = base64.b64decode(img_b64)
        result = detect_brand(img_bytes)
        self.send_json(200, result)

    # ─── /ocr-crop — OCR on individual crop ────────────────────────────

    def handle_ocr_crop(self, img_b64, known_brand=None):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return

        img_bytes = base64.b64decode(img_b64)
        text = ""

        if OCR_AVAILABLE and ocr_reader:
            try:
                results = ocr_reader.readtext(img_bytes)
                words = [r[1].strip() for r in results if r[2] > 0.4]
                text = " ".join(words)
                logger.info(f"[OCR-Crop] Text: \"{text[:80]}\"")
            except Exception as e:
                logger.error(f"[OCR-Crop] Failed: {e}")

        self.send_json(200, {"text": text, "knownBrand": known_brand})

    # ─── /barcode-crop — Barcode on individual crop ────────────────────

    def handle_barcode_crop(self, img_b64):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return

        img_bytes = base64.b64decode(img_b64)
        barcode = None

        if BARCODE_AVAILABLE:
            try:
                pil_img = Image.open(_io.BytesIO(img_bytes))
                barcodes = pyzbar.decode(pil_img)
                if barcodes:
                    barcode = barcodes[0].data.decode("utf-8")
                    logger.info(f"[Barcode-Crop] Detected: {barcode}")
            except Exception as e:
                logger.error(f"[Barcode-Crop] Failed: {e}")

        self.send_json(200, {"barcode": barcode})

    # ─── /attributes — Visual attributes ───────────────────────────────

    def handle_attributes(self, img_b64):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return
        img_bytes = base64.b64decode(img_b64)
        result = extract_attributes(img_bytes)
        self.send_json(200, result)

    # ─── /clip-similarity — CLIP-based Visual Similarity ────────────────

    def handle_clip_similarity(self, req_body):
        crop_b64 = req_body.get('crop', '')
        candidates_b64 = req_body.get('candidates', [])

        if not crop_b64 or not candidates_b64:
            self.send_json(400, {"error": "Missing crop or candidates in request"})
            return

        try:
            crop_bytes = base64.b64decode(crop_b64)
            candidates_bytes = [base64.b64decode(c) for c in candidates_b64]

            # Lazy load CLIP on demand
            if clip_model is None or clip_processor is None:
                init_clip()

            if clip_model is None or clip_processor is None:
                # Return neutral similarity if CLIP is unavailable
                self.send_json(200, {"similarities": [0.5] * len(candidates_b64)})
                return

            from PIL import Image
            import io as _io
            import torch

            crop_pil = Image.open(_io.BytesIO(crop_bytes)).convert("RGB")
            candidates_pil = [Image.open(_io.BytesIO(cb)).convert("RGB") for cb in candidates_bytes]

            inputs = clip_processor(images=[crop_pil] + candidates_pil, return_tensors="pt", padding=True)
            with torch.no_grad():
                image_features = clip_model.get_image_features(**inputs)

            # Normalize features
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            crop_feat = image_features[0:1] # shape (1, dim)
            cand_feats = image_features[1:] # shape (N, dim)

            similarities = torch.nn.functional.cosine_similarity(crop_feat, cand_feats, dim=-1)
            results = [round(float(s), 4) for s in similarities]
            self.send_json(200, {"similarities": results})

        except Exception as e:
            logger.error(f"[CLIP] Similarity failed: {e}")
            self.send_json(200, {"similarities": [0.5] * len(candidates_b64)})

    def _detect_and_debug(self, img_bytes, provider="openimages"):
        objects = []
        debug_info = {}

        model = yolo_openimages
        if provider == "fashionpedia":
            model = yolo_fashionpedia
            if model is None:
                logger.warning("Fashionpedia requested but unavailable. Falling back to OpenImages.")
                model = yolo_openimages
                provider = "openimages"

        if YOLO_AVAILABLE and model:
            try:
                temp_path = "tmp_cv_frame.jpg"
                with open(temp_path, "wb") as f:
                    f.write(img_bytes)

                h, w = 0, 0
                if CV2_AVAILABLE:
                    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
                    if img is not None:
                        h, w = img.shape[:2]

                results = model(temp_path, conf=0.05, verbose=False, device="cpu")

                raw_detections = []
                after_conf = []
                after_shoppable = []

                for r in results:
                    for box in r.boxes:
                        cls_idx = int(box.cls[0])
                        label = r.names[cls_idx]
                        conf = float(box.conf[0])
                        coords = box.xyxy[0].tolist()

                        raw_det = {
                            "class": label,
                            "confidence": round(conf, 4),
                            "box": [round(c, 1) for c in coords]
                        }
                        raw_detections.append(raw_det)

                        is_shoppable = False
                        mapped_label = label

                        if provider == "fashionpedia":
                            if cls_idx in FASHIONPEDIA_MAP:
                                is_shoppable = True
                                mapped_label = FASHIONPEDIA_MAP[cls_idx]
                        else:
                            if label.lower() in OPENIMAGES_SHOPPABLE:
                                is_shoppable = True

                        thresh = get_adaptive_threshold(mapped_label, coords, w, h)

                        if conf >= thresh:
                            after_conf.append(raw_det)
                            if is_shoppable:
                                after_shoppable.append(raw_det)
                                avg_hsv = get_crop_hsv(img, coords) if CV2_AVAILABLE else [0.0, 0.0, 0.0]
                                objects.append({
                                    "box": coords,
                                    "label": mapped_label,
                                    "confidence": conf,
                                    "avg_hsv": avg_hsv
                                })

                if os.path.exists(temp_path):
                    os.remove(temp_path)

                debug_log = []
                debug_log.append("========== YOLO DEBUG ==========")
                debug_log.append(f"Model: {provider.capitalize()}")
                debug_log.append(f"Image size: {w}x{h}")
                debug_log.append("")
                debug_log.append("Raw detections:")
                for rd in raw_detections:
                    debug_log.append(f"  Class: {rd['class']}, Confidence: {rd['confidence']:.2f}, Bounding Box: {rd['box']}")
                debug_log.append("")
                debug_log.append("After confidence filtering:")
                for ac in after_conf:
                    debug_log.append(f"  Class: {ac['class']}, Confidence: {ac['confidence']:.2f}, Bounding Box: {ac['box']}")
                debug_log.append("")
                debug_log.append("After shoppable filtering:")
                for as_det in after_shoppable:
                    debug_log.append(f"  Class: {as_det['class']}, Confidence: {as_det['confidence']:.2f}, Bounding Box: {as_det['box']}")
                debug_log.append("")
                debug_log.append("Final detections:")
                for obj in objects:
                    debug_log.append(f"  Class: {obj['label']}, Confidence: {obj['confidence']:.2f}, Bounding Box: {[round(c, 1) for c in obj['box']]}")
                debug_log.append("================================")

                debug_log_str = "\n".join(debug_log)
                logger.info(debug_log_str)

                debug_info = {
                    "model": provider,
                    "image_size": f"{w}x{h}",
                    "raw_detections": raw_detections,
                    "after_confidence": after_conf,
                    "after_shoppable": after_shoppable,
                    "final_detections": objects,
                    "debug_log_str": debug_log_str
                }
            except Exception as e:
                logger.error(f"[YOLO] Detection failed: {e}")
        return objects, debug_info


    # ─── Utility ───────────────────────────────────────────────────────

    def send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))


def run_server(port=5000):
    init_models()
    server_address = ('', port)
    httpd = HTTPServer(server_address, CVRequestHandler)
    logger.info(f"[cv_server] Cartly v3 — Listening on http://localhost:{port}")
    logger.info(f"[cv_server] Endpoints: /detect /crop-quality /logo-detect /ocr-crop /barcode-crop /attributes /health")
    logger.info(f"[cv_server] Capabilities: YOLO={YOLO_AVAILABLE}, OCR={OCR_AVAILABLE}, Barcode={BARCODE_AVAILABLE}, OpenCV={CV2_AVAILABLE}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("[cv_server] Shutting down.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
