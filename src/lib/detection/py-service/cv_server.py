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
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("ultralytics not installed. YOLO detection disabled — Cloud VLM will be used instead.")

try:
    import easyocr
    OCR_AVAILABLE = True
    logger.info("easyocr is available.")
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("easyocr not installed. OCR disabled.")

try:
    from pyzbar import pyzbar
    from PIL import Image
    import io as _io
    BARCODE_AVAILABLE = True
    logger.info("pyzbar is available.")
except ImportError:
    BARCODE_AVAILABLE = False
    logger.warning("pyzbar or Pillow not installed. Barcode detection disabled.")

try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("OpenCV (cv2) is available.")
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("opencv-python not installed. Crop quality and scene detection disabled.")

# ─────────────────────────────────────────────
# Global model instances
# ─────────────────────────────────────────────
yolo_model = None
ocr_reader = None

# Cartly v3 — Curated shoppable classes (~35 categories)
# Only objects worth shopping for are returned. Excludes person, dog, cat, etc.
SHOPPABLE_CLASSES = {
    "backpack", "handbag", "suitcase", "umbrella", "tie",
    "cell phone", "laptop", "remote", "keyboard", "mouse", "tv",
    "chair", "couch", "bed", "dining table",
    "bottle", "wine glass", "cup", "bowl", "vase", "clock",
    "book", "scissors",
    "sports ball", "tennis racket", "skateboard", "surfboard",
    "snowboard", "skis", "bicycle", "motorcycle",
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
    global yolo_model, ocr_reader

    if YOLO_AVAILABLE:
        try:
            yolo_model = YOLO("yolov8n.pt")
            logger.info("YOLOv8 Nano model loaded.")
        except Exception as e:
            logger.error(f"Failed to load YOLO: {e}")

    if OCR_AVAILABLE:
        try:
            ocr_reader = easyocr.Reader(['en'], gpu=False)
            logger.info("EasyOCR Reader loaded.")
        except Exception as e:
            logger.error(f"Failed to load EasyOCR: {e}")


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
                self.handle_detect(img_b64)
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
            else:
                self.send_response(404)
                self.end_headers()

        except Exception as e:
            logger.exception("Request processing failed")
            self.send_json(500, {"error": str(e)})

    # ─── /detect — YOLO detection (shoppable classes only) ─────────────

    def handle_detect(self, img_b64):
        if not img_b64:
            self.send_json(400, {"error": "Missing base64 image"})
            return

        img_bytes = base64.b64decode(img_b64)
        objects = []

        if YOLO_AVAILABLE and yolo_model:
            try:
                temp_path = "tmp_cv_frame.jpg"
                with open(temp_path, "wb") as f:
                    f.write(img_bytes)

                # Set threshold to 0.20 to catch more potential fashion items
                conf_threshold = 0.20
                logger.info(f"[YOLO] Running detection with yolov8n.pt (threshold: {conf_threshold})")
                results = yolo_model(temp_path, conf=conf_threshold, verbose=False)
                
                raw_count = 0
                for r in results:
                    for box in r.boxes:
                        raw_count += 1
                        label = r.names[int(box.cls[0])]
                        conf = float(box.conf[0])
                        coords = box.xyxy[0].tolist()

                        is_shoppable = label.lower() in SHOPPABLE_CLASSES
                        if is_shoppable:
                            logger.info(f"  ├─ RAW DETECT: class=\"{label}\" conf={conf:.2f} -> PASS (Shoppable)")
                            objects.append({
                                "box": coords,
                                "label": label,
                                "confidence": conf,
                            })
                        else:
                            logger.info(f"  ├─ RAW DETECT: class=\"{label}\" conf={conf:.2f} -> FILTERED (Not Shoppable)")

                if os.path.exists(temp_path):
                    os.remove(temp_path)

                logger.info(f"[YOLO] Done: {raw_count} raw detected, {len(objects)} shoppable objects kept.")
            except Exception as e:
                logger.error(f"[YOLO] Detection failed: {e}")

        self.send_json(200, {"objects": objects})

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
