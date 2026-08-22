import cv2
import numpy as np
from app.services.face_model import extract_embedding, yolo_available

print("YOLO Available:", yolo_available)

# Create a dummy image
img = np.zeros((480, 640, 3), dtype=np.uint8)

print("Running extract_embedding...")
try:
    emb = extract_embedding(img)
    print("Embedding length:", len(emb))
except Exception as e:
    print("Error:", e)
print("Done.")
