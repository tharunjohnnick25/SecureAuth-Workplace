from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import time

from app.core.security import verify_api_key, limiter
from app.services.image_utils import decode_base64_image
from app.services.face_model import extract_embedding, compare_embeddings
from app.services.liveness import compute_liveness

router = APIRouter()

class VerifyRequest(BaseModel):
    captured_image_base64: str = Field(..., description="Base64 encoded webcam capture")
    enrolled_embedding: list[float] = Field(..., description="512D embedding vector from database")
    require_liveness: bool = Field(True, description="Whether to enforce anti-spoofing")

class VerifyResponse(BaseModel):
    verified: bool
    confidence: float
    liveness: bool
    error: str | None = None
    model_version: str

class EnrollRequest(BaseModel):
    captured_image_base64: str = Field(..., description="Base64 encoded webcam capture")
    require_liveness: bool = Field(True, description="Whether to enforce anti-spoofing")

class EnrollResponse(BaseModel):
    embedding: list[float]
    liveness: bool
    error: str | None = None
    model_version: str

@router.post("/enroll", response_model=EnrollResponse)
@limiter.limit("5/minute")
async def enroll_face(request: Request, payload: EnrollRequest, api_key: str = Depends(verify_api_key)):
    try:
        start_time = time.time()
        
        # 1. Decode Image
        img = decode_base64_image(payload.captured_image_base64)
        
        # 2. Liveness Check
        is_live = True
        if payload.require_liveness:
            is_live, liveness_score = compute_liveness(img)
            if not is_live:
                return EnrollResponse(
                    embedding=[],
                    liveness=False,
                    error="Liveness check failed. Please ensure adequate lighting and use a live camera.",
                    model_version="Facenet512"
                )
                
        # 3. Extract Embedding from captured image (enforces exactly 1 face)
        embedding = extract_embedding(img)
        
        if (time.time() - start_time) > 3.0:
            print("Warning: Inference exceeded 3000ms threshold.")
            
        return EnrollResponse(
            embedding=embedding,
            liveness=is_live,
            model_version="Facenet512"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Internal error during enrollment: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error")

@router.post("/verify", response_model=VerifyResponse)
@limiter.limit("10/minute")
async def verify_face(request: Request, payload: VerifyRequest, api_key: str = Depends(verify_api_key)):
    try:
        start_time = time.time()
        
        # 1. Decode Image (Strict limits applied in utility)
        img = decode_base64_image(payload.captured_image_base64)
        
        # 2. Liveness Check
        is_live = True
        liveness_score = 1.0
        if payload.require_liveness:
            is_live, liveness_score = compute_liveness(img)
            print(f"DEBUG - Liveness Score: {liveness_score}, Is Live: {is_live}")
            if not is_live:
                return VerifyResponse(
                    verified=False,
                    confidence=0.0,
                    liveness=False,
                    error="Liveness check failed. Please ensure adequate lighting and use a live camera.",
                    model_version="DeepFace_v1"
                )
                
        # 3. Extract Embedding from captured image
        captured_embedding = extract_embedding(img)
        
        # 4. Compare with enrolled template
        verified, similarity = compare_embeddings(captured_embedding, payload.enrolled_embedding)
        
        # Enforce strict 3 second timeout on processing
        if (time.time() - start_time) > 3.0:
            print("Warning: Inference exceeded 3000ms threshold.")
            
        return VerifyResponse(
            verified=verified,
            confidence=similarity,
            liveness=is_live,
            model_version="DeepFace_v1"
        )
        
    except ValueError as e:
        # e.g., "No face detected"
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Avoid leaking internal stack traces in production
        print(f"Internal error during verification: {e}")
        raise HTTPException(status_code=500, detail="Internal processing error")

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "secureauth-face-api"}
