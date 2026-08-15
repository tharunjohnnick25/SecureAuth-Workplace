import numpy as np
import cv2
import base64
import os

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
PROTOTXT_PATH = os.path.join(MODELS_DIR, "deploy.prototxt")
CAFFEMODEL_PATH = os.path.join(MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")
TORCHMODEL_PATH = os.path.join(MODELS_DIR, "openface.nn4.small2.v1.t7")

class ArcFaceService:
    def __init__(self):
        self.detector = None
        self.embedder = None
        
        # Load models if they exist (they should be downloaded by the script)
        if os.path.exists(PROTOTXT_PATH) and os.path.exists(CAFFEMODEL_PATH):
            self.detector = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, CAFFEMODEL_PATH)
        if os.path.exists(TORCHMODEL_PATH):
            self.embedder = cv2.dnn.readNetFromTorch(TORCHMODEL_PATH)
            
    def _decode_image(self, image_base64: str):
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        img_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
        
    def _preprocess(self, img):
        # CLAHE (Contrast Limited Adaptive Histogram Equalization) for lighting normalization
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        img_clahe = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # Gaussian blur to reduce noise
        img_blur = cv2.GaussianBlur(img_clahe, (3, 3), 0)
        return img_blur
        
    def _detect_face(self, img):
        if self.detector is None:
            raise RuntimeError("Face detector model not loaded.")
            
        (h, w) = img.shape[:2]
        # Preprocessing blob for DNN
        blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 1.0,
            (300, 300), (104.0, 177.0, 123.0))
            
        self.detector.setInput(blob)
        detections = self.detector.forward()
        
        max_confidence = 0
        best_box = None
        
        for i in range(0, detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > 0.5 and confidence > max_confidence:
                max_confidence = confidence
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                
                # Boundary checks
                startX = max(0, startX)
                startY = max(0, startY)
                endX = min(w, endX)
                endY = min(h, endY)
                
                if endX > startX and endY > startY:
                    best_box = (startX, startY, endX, endY)
                    
        return best_box

    def generate_embedding(self, image_base64: str) -> list[float]:
        """
        Generates a 128-dim face embedding using OpenCV OpenFace model.
        Falls back to mock if models are not available.
        """
        if self.detector is None or self.embedder is None:
            # Mock fallback logic just in case
            np.random.seed(len(image_base64) % 1000)
            embedding = np.random.rand(128).astype(np.float32)
            embedding = embedding / np.linalg.norm(embedding)
            return embedding.tolist()
            
        img = self._decode_image(image_base64)
        if img is None:
            raise ValueError("Invalid image data")
            
        img = self._preprocess(img)
        box = self._detect_face(img)
        
        if box is None:
            raise ValueError("No face detected in the image")
            
        (startX, startY, endX, endY) = box
        face = img[startY:endY, startX:endX]
        
        # OpenFace expects 96x96 input
        face_blob = cv2.dnn.blobFromImage(face, 1.0 / 255, (96, 96), (0, 0, 0), swapRB=True, crop=False)
        self.embedder.setInput(face_blob)
        embedding = self.embedder.forward()
        
        # Flatten and normalize
        embedding = embedding.flatten()
        embedding = embedding / np.linalg.norm(embedding)
        return embedding.tolist()
        
    def average_embeddings(self, embeddings: list[list[float]]) -> list[float]:
        """
        Averages 3 embeddings into a robust template.
        """
        if not embeddings:
            raise ValueError("No embeddings provided")
            
        arr = np.array(embeddings)
        avg = np.mean(arr, axis=0)
        # Renormalize
        avg = avg / np.linalg.norm(avg)
        return avg.tolist()

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Computes cosine similarity between two vectors.
    """
    vec_a = np.array(a)
    vec_b = np.array(b)
    dot = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(dot / (norm_a * norm_b))
