import os
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

# URLs for models
URLS = {
    "deploy.prototxt": "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
    "res10_300x300_ssd_iter_140000.caffemodel": "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
    "openface.nn4.small2.v1.t7": "https://raw.githubusercontent.com/pyannote/pyannote-data/master/openface.nn4.small2.v1.t7",
    "haarcascade_frontalface_default.xml": "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"
}

def download_models():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        
    for filename, url in URLS.items():
        filepath = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"Downloading {filename}...")
            try:
                urllib.request.urlretrieve(url, filepath)
                print(f"Successfully downloaded {filename}")
            except Exception as e:
                print(f"Failed to download {filename}: {e}")
        else:
            print(f"{filename} already exists.")

if __name__ == "__main__":
    download_models()
