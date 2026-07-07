import urllib.request
import os
from ultralytics import YOLO

model_url = "https://huggingface.co/AltaDaily/yolo11n-fashionpedia/resolve/main/best.pt"
model_path = "yolov11n-fashionpedia.pt"

if not os.path.exists(model_path):
    print(f"Downloading {model_url} to {model_path}...")
    urllib.request.urlretrieve(model_url, model_path)
    print("Download finished!")

print("Loading model...")
model = YOLO(model_path)
print("Model loaded successfully!")
print("Classes:")
for k, v in model.names.items():
    print(f"  {k}: {v}")
