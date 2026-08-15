from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EnrollRequest(BaseModel):
    employeeId: str
    photos: List[str] # Base64 strings of the 3 photos
    embeddings: List[List[float]] # Frontend can pass embeddings directly or backend calculates them
    consentGiven: bool

class EnrollResponse(BaseModel):
    success: bool
    message: str
    embedding_id: Optional[str] = None

class VerifyRequest(BaseModel):
    email: str
    embedding: List[float]
    liveness: Optional[float] = None
    deviceFingerprint: Optional[str] = None

class VerifyResponse(BaseModel):
    success: bool
    similarity: float
    liveness: float
    error: Optional[str] = None
    user: Optional[dict] = None
