import cv2
import numpy as np
from app.core.config import settings

def compute_liveness(img: np.ndarray) -> tuple[bool, float]:
    """
    Computes a basic liveness score to prevent simple photo spoofing.
    Uses Laplacian variance to check for blurriness (printed photos often lack sharpness/depth).
    In a true production environment, this should be replaced with a Deep Learning Anti-Spoofing model.
    """
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate Laplacian variance (sharpness/focus measure)
        # Low variance = blurry = likely a printed photo or screen
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize score (heuristic). A good webcam capture usually has variance > 100.
        score = min(variance / 300.0, 1.0)
        
        is_live = score >= settings.LIVENESS_THRESHOLD
        
        return is_live, float(score)
    except Exception as e:
        # Fallback to false if analysis fails
        return False, 0.0
