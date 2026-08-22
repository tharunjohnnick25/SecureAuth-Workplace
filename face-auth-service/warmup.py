import urllib.request
import json

url = 'http://localhost:8001/api/v1/face/enroll'
data = {
    "captured_image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "require_liveness": False
}
req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode('utf-8'), 
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer face-api-key-secure-2026'
    }
)

print("Warming up Python backend models...")
try:
    with urllib.request.urlopen(req) as response:
        result = response.read()
        print(result)
except Exception as e:
    print("Error:", e)
print("Warm-up complete.")
