from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_KEY: str = "face-api-key-secure-2026"
    MODEL_NAME: str = "Facenet512" # deepface default is VGG-Face or Facenet
    DETECTOR_BACKEND: str = "yolov8_custom"
    YOLO_MODEL_PATH: str = r"C:\Users\Admin\runs\detect\fast_face_model-2\weights\best.pt"
    MATCH_THRESHOLD: float = 0.60
    LIVENESS_THRESHOLD: float = 0.10
    MAX_IMAGE_SIZE_MB: int = 5

    class Config:
        env_file = ".env"

settings = Settings()
