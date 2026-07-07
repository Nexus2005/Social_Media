import urllib.request
import os
import time

model_url = "https://huggingface.co/louisJLN/yolo8-fashionpedia/resolve/main/results/yolov8n-fashionpedia-1.onnx"
model_path = "yolov8n-fashionpedia.onnx"

if os.path.exists(model_path):
    os.remove(model_path)

print(f"Downloading {model_url}...")
for attempt in range(5):
    try:
        req = urllib.request.Request(
            model_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            with open(model_path, 'wb') as out_file:
                chunk_size = 1024 * 1024  # 1MB
                downloaded = 0
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)
                    print(f"Downloaded {downloaded / (1024*1024):.2f} MB")
        print("Download successful!")
        break
    except Exception as e:
        print(f"Attempt {attempt+1} failed: {e}")
        time.sleep(2)
