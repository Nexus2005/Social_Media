import urllib.request
import os
from ultralytics import YOLO

model_url = "https://huggingface.co/louisJLN/yolo8-fashionpedia/resolve/main/results/yolov8n-fashionpedia-1.onnx"
model_path = "yolov8n-fashionpedia.onnx"

if not os.path.exists(model_path):
    print(f"Downloading {model_url} to {model_path}...")
    try:
        urllib.request.urlretrieve(model_url, model_path)
        print("Download finished!")
    except Exception as e:
        print(f"Download failed: {e}")
        exit(1)

if os.path.exists(model_path):
    print("Loading ONNX model...")
    try:
        model = YOLO(model_path)
        print("Model loaded successfully!")
        print("Classes:")
        for k, v in model.names.items():
            print(f"  {k}: {v}")
    except Exception as e:
        print(f"Load failed: {e}")
