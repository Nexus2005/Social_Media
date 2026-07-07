from ultralytics import YOLO
import sys
try:
    model = YOLO("yolov8n-oiv7.pt")
    print("Successfully loaded yolov8n-oiv7.pt")
    # print names of classes related to fashion
    fashion_keywords = ["cloth", "wear", "shoe", "boot", "pant", "shirt", "coat", "jacket", "dress", "suit", "watch", "glasses", "sunglasses", "handbag", "bag", "backpack", "necklace", "bracelet", "ring", "jewelry", "footwear"]
    fashion_classes = []
    for cid, name in model.names.items():
        if any(kw in name.lower() for kw in fashion_keywords):
            fashion_classes.append((cid, name))
    print(f"Found {len(fashion_classes)} fashion-related classes:")
    for cid, name in fashion_classes:
        print(f"  {cid}: {name}")
except Exception as e:
    print("Error loading model:", e)
    sys.exit(1)
