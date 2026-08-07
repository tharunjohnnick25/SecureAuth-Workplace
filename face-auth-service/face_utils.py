import cv2
import numpy as np
from deepface import DeepFace

def check_image_quality(image_np):
    """
    Checks blur and brightness of the image.
    Returns (is_good, reason)
    """
    if image_np is None or image_np.size == 0:
        return False, "Invalid image"
        
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    
    # Blur detection
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 100: # Threshold for blurriness
        return False, "Image is too blurry"
        
    # Brightness detection
    brightness = np.mean(gray)
    if brightness < 40:
        return False, "Image is too dark"
    if brightness > 240:
        return False, "Image is too bright"
        
    return True, "Good"

def extract_face_embedding(image_np):
    """
    Detects face and extracts embedding using DeepFace.
    Returns (embedding, error_message)
    """
    try:
        # DeepFace.represent returns a list of dictionaries (one per face detected)
        # We enforce enforce_detection=True to ensure a face is present.
        result = DeepFace.represent(img_path=image_np, model_name="Facenet", enforce_detection=True)
        
        if len(result) == 0:
            return None, "No face detected"
        if len(result) > 1:
            return None, "Multiple faces detected. Only one person allowed."
            
        embedding = result[0]["embedding"]
        return embedding, None
    except Exception as e:
        return None, str(e)

def match_face(img_np, stored_embedding):
    """
    Matches a live image against a stored embedding.
    DeepFace doesn't natively do (image vs embedding) directly in the simplified API,
    so we extract the embedding of the live image and compute cosine similarity.
    """
    live_embedding, error = extract_face_embedding(img_np)
    if error:
        return False, 0.0, error
        
    # Cosine similarity
    vec1 = np.array(live_embedding)
    vec2 = np.array(stored_embedding)
    
    dot = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    similarity = dot / (norm1 * norm2)
    
    # Threshold for Facenet cosine similarity is usually around 0.40 distance (0.60 similarity) 
    # But let's scale it to a percentage for the UI
    confidence = similarity * 100
    
    is_match = confidence >= 70.0 # Adjust based on empirical testing
    return is_match, confidence, None
