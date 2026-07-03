import os
import base64
import json
import logging
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
    import io
    BARCODE_AVAILABLE = True
    logger.info("pyzbar is available.")
except ImportError:
    BARCODE_AVAILABLE = False
    logger.warning("pyzbar or Pillow not installed. Barcode detection disabled.")

# ─────────────────────────────────────────────
# Global model instances
# ─────────────────────────────────────────────
yolo_model = None
ocr_reader = None

# YOLO classes relevant to fashion/shopping (COCO dataset labels)
FASHION_LABELS = {
    "person", "backpack", "umbrella", "handbag", "tie",
    "suitcase", "sneaker", "boot", "sandal", "shoe",
    "glasses", "sunglasses", "watch", "clock",
    "cell phone", "laptop", "remote",
    "book", "vase",
}

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


class CVRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return  # Suppress noisy HTTP request logs

    def do_POST(self):
        if self.path != '/detect':
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            req_body = json.loads(post_data.decode('utf-8'))
            img_b64 = req_body.get('image', '')
            if not img_b64:
                self.send_error_response("Missing base64 image in 'image' payload.")
                return

            img_bytes = base64.b64decode(img_b64)
            detections = self.run_pipeline(img_bytes)

            # ── Stage summary log ───────────────────────────────────────
            logger.info(f"[cv_server] Pipeline result: {len(detections)} object(s) detected.")
            for i, d in enumerate(detections):
                logger.info(
                    f"  [{i+1}] label={d.get('label')}  conf={d.get('confidence'):.2f}"
                    f"  barcode={d.get('barcode')}  logo={d.get('logo')}"
                    f"  ocr=\"{d.get('ocrText','')[:60]}\""
                )
            if not detections:
                logger.info("  [cv_server] No objects detected — Cloud VLM will be invoked.")
            # ─────────────────────────────────────────────────────────────

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"objects": detections}).encode('utf-8'))

        except Exception as e:
            logger.exception("Failed to process detection request")
            self.send_error_response(str(e))

    def send_error_response(self, msg):
        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode('utf-8'))

    def run_pipeline(self, img_bytes: bytes) -> list:
        objects = []

        # ── Stage 1: YOLO detection ───────────────────────────────────
        if YOLO_AVAILABLE and yolo_model:
            try:
                temp_path = "tmp_cv_frame.jpg"
                with open(temp_path, "wb") as f:
                    f.write(img_bytes)

                results = yolo_model(temp_path, verbose=False)
                for r in results:
                    for box in r.boxes:
                        label = r.names[int(box.cls[0])]
                        conf = float(box.conf[0])
                        coords = box.xyxy[0].tolist()

                        objects.append({
                            "box": coords,
                            "label": label,
                            "confidence": conf,
                            "ocrText": "",
                            "barcode": None,
                            "logo": None,
                            "attributes": {"color": "unknown"}
                        })

                if os.path.exists(temp_path):
                    os.remove(temp_path)

                logger.info(f"[YOLO] Detected {len(objects)} raw objects.")
            except Exception as e:
                logger.error(f"[YOLO] Detection failed: {e}")
        else:
            logger.info("[YOLO] Not available — skipping.")

        # ── Stage 2: Barcode detection ────────────────────────────────
        if BARCODE_AVAILABLE and objects:
            try:
                pil_img = Image.open(io.BytesIO(img_bytes))
                barcodes = pyzbar.decode(pil_img)
                if barcodes:
                    bc_value = barcodes[0].data.decode("utf-8")
                    logger.info(f"[Barcode] Detected: {bc_value}")
                    # Attach barcode to first matched object (or all if only one)
                    for obj in objects[:1]:
                        obj["barcode"] = bc_value
                else:
                    logger.info("[Barcode] No barcode found.")
            except Exception as e:
                logger.error(f"[Barcode] Detection failed: {e}")
        else:
            logger.info("[Barcode] Skipped (pyzbar unavailable or no objects).")

        # ── Stage 3: OCR on full frame ────────────────────────────────
        if OCR_AVAILABLE and ocr_reader and objects:
            try:
                ocr_results = ocr_reader.readtext(img_bytes)
                words = [res[1] for res in ocr_results if res[2] > 0.4]
                ocr_text = " ".join(words)
                logger.info(f"[OCR] Extracted text: \"{ocr_text[:80]}\"")

                known_brands = {"nike", "adidas", "puma", "reebok", "new balance",
                                "rolex", "casio", "apple", "samsung", "sony", "gucci",
                                "louis vuitton", "zara", "h&m", "under armour", "champion"}

                detected_logo = None
                for w in words:
                    if w.lower().strip() in known_brands:
                        detected_logo = w
                        logger.info(f"[Logo] Detected brand from OCR: {w}")
                        break

                for obj in objects:
                    if ocr_text:
                        obj["ocrText"] = ocr_text
                    if detected_logo:
                        obj["logo"] = detected_logo
            except Exception as e:
                logger.error(f"[OCR] Failed: {e}")
        else:
            logger.info("[OCR] Skipped (easyocr unavailable or no objects).")

        # ── NO MOCK FALLBACK ──────────────────────────────────────────
        # If no libraries are available and nothing was detected,
        # return an empty list. The Node.js DetectionPipeline will
        # see confidence = 0.0 and correctly invoke Cloud VLM.
        if not objects:
            logger.info("[cv_server] No detections — returning empty. Node.js will invoke Cloud VLM.")

        return objects


def run_server(port=5000):
    init_models()
    server_address = ('', port)
    httpd = HTTPServer(server_address, CVRequestHandler)
    logger.info(f"[cv_server] Listening on http://localhost:{port}/detect")
    logger.info(f"[cv_server] Capabilities: YOLO={YOLO_AVAILABLE}, OCR={OCR_AVAILABLE}, Barcode={BARCODE_AVAILABLE}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("[cv_server] Shutting down.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
