from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.api.routes import router as api_router
from app.core.security import limiter

app = FastAPI(
    title="SecureAuth Face Authentication API",
    description="Stateless DeepFace integration for secure IAM biometrics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

# Register Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Policy (Restrict to localhost/Next.js origin in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1/face", tags=["Face Auth"])
