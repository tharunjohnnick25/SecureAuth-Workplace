import numpy as np
from deepface import DeepFace
from app.core.config import settings

import os
import cv2

# Attempt to load the custom YOLO model if it exists
yolo_model = None
yolo_available = False
if settings.DETECTOR_BACKEND == "yolov8_custom":
    try:
        from ultralytics import YOLO
        if os.path.exists(settings.YOLO_MODEL_PATH):
            yolo_model = YOLO(settings.YOLO_MODEL_PATH)
            yolo_available = True
            print("Successfully loaded custom YOLOv8 face detector!")
        else:
            print("WARNING: Custom YOLO model not found. Falling back to OpenCV.")
    except Exception as e:
        print(f"WARNING: Failed to load ultralytics YOLO model: {e}. Falling back to OpenCV.")

def extract_embedding(img: np.ndarray) -> list[float]:
    """
    Extracts a face embedding vector from an OpenCV image.
    Uses custom YOLOv8 for precise cropping (if available), then DeepFace for embeddings.
    """
    try:
        target_img = img
        backend = settings.DETECTOR_BACKEND

        # Custom YOLO Crop-and-Embed Pipeline
        if backend == "yolov8_custom":
            if yolo_available and yolo_model:
                results = yolo_model(img, verbose=False)
                boxes = results[0].boxes
                
                if len(boxes) == 0:
                    raise ValueError("No face detected in the image.")
                if len(boxes) > 1:
                    raise ValueError("Multiple faces detected. Please ensure only one face is visible.")
                
                # Crop the highest confidence face
                box = boxes[0].xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, box)
                
                # Add a slight 10% padding around the face for better embedding extraction
                h, w = img.shape[:2]
                pad_x = int((x2 - x1) * 0.1)
                pad_y = int((y2 - y1) * 0.1)
                x1, y1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
                x2, y2 = min(w, x2 + pad_x), min(h, y2 + pad_y)
                
                target_img = img[y1:y2, x1:x2]
                backend = "skip" # Tell DeepFace we already cropped it
            else:
                # Fallback if yolov8_custom is unavailable
                backend = "opencv"

        # enforce_detection=True if using OpenCV, False if we already skipped detection
        embedding_objs = DeepFace.represent(
            img_path=target_img,
            model_name=settings.MODEL_NAME,
            detector_backend=backend,
            enforce_detection=(backend != "skip")
        )
        
        if not embedding_objs or len(embedding_objs) == 0:
            raise ValueError("No face detected during embedding extraction.")
            
        if len(embedding_objs) > 1 and backend != "skip":
            raise ValueError("Multiple faces detected. Please ensure only one face is visible.")
            
        # Extract embedding for the single detected face
        embedding = embedding_objs[0]["embedding"]
        return embedding
    except Exception as e:
        raise ValueError(f"Face extraction failed: {str(e)}")

def compare_embeddings(emb1: list[float], emb2: list[float]) -> tuple[bool, float]:
    """
    Compares two embeddings using Cosine Similarity.
    Returns (verified, distance)
    """
    try:
        a = np.array(emb1)
        b = np.array(emb2)
        
        # Cosine distance
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        cosine_similarity = dot_product / (norm_a * norm_b)
        distance = 1 - cosine_similarity
        
        # In DeepFace VGG-Face, a lower distance means higher similarity.
        # Threshold for VGG-Face cosine is typically around 0.40 distance
        # We use MATCH_THRESHOLD from config, interpreting it as similarity here:
        verified = cosine_similarity >= settings.MATCH_THRESHOLD
        
        print(f"DEBUG - Cosine Similarity: {cosine_similarity}, Verified: {verified}, Threshold: {settings.MATCH_THRESHOLD}")
        return verified, float(cosine_similarity)
    except Exception as e:
        raise ValueError(f"Comparison failed: {str(e)}")
