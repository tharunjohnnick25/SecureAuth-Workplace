import base64
import cv2
import numpy as np
from fastapi import HTTPException
from app.core.config import settings

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decodes a base64 image string into an OpenCV numpy array (BGR)."""
    try:
        # Check size limit (approximate from base64 length)
        # 1 char = 1 byte. Base64 is 4/3 the size of the original.
        size_in_mb = len(base64_string) * 0.75 / (1024 * 1024)
        if size_in_mb > settings.MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=413, detail=f"Image exceeds {settings.MAX_IMAGE_SIZE_MB}MB limit.")

        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
            
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Decoded image is empty.")
            
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")
