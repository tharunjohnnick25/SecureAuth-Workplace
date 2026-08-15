# Face Recognition Auth Service

This microservice provides the computer vision backend for the enterprise IT workspace face authentication system. It leverages advanced models for high-accuracy embeddings and multi-modal liveness detection to ensure security and prevent spoofing.

## Tech Stack
- FastAPI, Pydantic, Uvicorn
- OpenCV, ONNX Runtime (mocked in this environment)
- InsightFace (ArcFace ResNet-100) - For 512-dim facial embeddings
- Ultralytics (YOLOv8n) - For spatial/passive liveness detection
- PyTorch (ConvLSTM / Res2Net) - For active and voice liveness detection

## Installation & Setup
1. **Install requirements:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Run the API server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   ```

## Model Pipeline

1. **Enrollment (`/api/v1/face/enroll`)**: 
   - Accepts 3 photos (front, left, right).
   - Extracts 512-dim ArcFace embeddings for each.
   - Averages the vectors for a robust template and encrypts it via AES-256 before database storage.
   - Requires explicit GDPR consent flag.

2. **Verification (`/api/v1/face/verify`)**:
   - Evaluates **Passive Liveness** (texture/depth via YOLOv8n).
   - Evaluates **Active Liveness** (blink cadence, head turns via ConvLSTM).
   - Fuses multi-modal scores (Face + Voice optional) to generate a final liveness confidence.
   - Extracts a live embedding and computes the **Cosine Similarity** against the enrolled template.
   - Access granted if liveness > 0.85 and similarity > 0.6.

## Compliance (GDPR/DPDP)
This service is built with data minimization in mind. 
- **No Raw Storage**: Images are only kept in memory during inference. Temporary S3 buckets have a 24-hour cleanup cron job.
- **Biometric Erasure**: Exposed a `DELETE /api/v1/employees/{email}/biometrics` endpoint for soft deletion (30-day retention).

### DPIA Template (Data Protection Impact Assessment)
**Data Types Collected**: Encrypted mathematical representations (embeddings) of faces.
**Purpose**: Secure biometric authentication.
**Retention Period**: Until employment ends or user revokes consent.
**Risk Mitigation**: Data is encrypted at rest (AES-256), TLS 1.3 in transit, and robust anti-spoofing logic mitigates identity theft. 

## DevOps
- **Helm**: Deploy using the provided `helm/values.yaml`. Auto-scales up to 10 replicas.
- **Docker**: Included multi-stage Dockerfile handles OpenCV and ML dependency compilation natively.
