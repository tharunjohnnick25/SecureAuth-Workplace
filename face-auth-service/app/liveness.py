import cv2
import numpy as np
from deepface import DeepFace

from .config import get_settings

_EYE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_eye.xml"


class BlinkDetector:
    def __init__(self) -> None:
        self.eye_cascade = cv2.CascadeClassifier(_EYE_CASCADE_PATH)
        self._eyes_open = True
        self.blinks = 0

    def detect(self, gray: np.ndarray) -> int:
        eyes = self.eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        eyes_open = len(eyes) > 0
        if not eyes_open and self._eyes_open:
            self.blinks += 1
        self._eyes_open = eyes_open
        return self.blinks


def antispoof(frame: np.ndarray) -> dict:
    faces = DeepFace.extract_faces(
        frame,
        detector_backend=get_settings().face_detector_backend,
        anti_spoofing=True,
        enforce_detection=False,
    )
    if not faces:
        return {"ok": False, "error": "No face detected", "score": 0.0}

    face = faces[0]
    score = face.get("antispoof_score")
    if score is None:
        score = 1.0 if face.get("is_real") else 0.0

    return {
        "ok": bool(face.get("is_real")),
        "score": float(score),
    }
