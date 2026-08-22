import cv2
import urllib.request
import numpy as np
from app.services.face_model import extract_embedding

print("Downloading image...")
req = urllib.request.urlopen('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/President_Barack_Obama_%28cropped%29.jpg/220px-President_Barack_Obama_%28cropped%29.jpg')
arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
img = cv2.imdecode(arr, -1)

print("Running extract_embedding...")
try:
    emb = extract_embedding(img)
    print("Embedding length:", len(emb))
    print("Embedding snippet:", emb[:5])
except Exception as e:
    print("Error:", e)
print("Done.")
