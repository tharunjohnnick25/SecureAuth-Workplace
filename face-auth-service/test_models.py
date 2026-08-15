import sys
import os

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.face_recognition import ArcFaceService

def main():
    service = ArcFaceService()
    if service.detector is not None and service.embedder is not None:
        print("Models loaded successfully!")
    else:
        print("Failed to load models!")
        sys.exit(1)

if __name__ == "__main__":
    main()
