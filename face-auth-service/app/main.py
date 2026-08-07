import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from . import db, face_service, security, ws
from .config import get_settings
from .schemas import IdentifyPayload, ImagePayload, RegisterPayload, VerifyPayload

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    face_service.warm_up()
    yield
    face_service.shutdown()


settings = get_settings()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.env, "model": settings.face_model}


@app.post("/api/v1/face/extract", dependencies=[Depends(security.require_service_auth)])
async def extract_embedding(payload: ImagePayload):
    try:
        image = face_service.decode_image(payload.image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    quality = face_service.check_quality(image)
    if not quality["ok"]:
        raise HTTPException(status_code=422, detail=quality["reason"])

    result = face_service.extract_embedding(image)
    if not result["ok"]:
        raise HTTPException(status_code=422, detail=result["error"])

    return {
        "success": True,
        "model": settings.face_model,
        "dimension": len(result["embedding"]),
        "embedding": result["embedding"],
    }


@app.post("/api/v1/face/register", dependencies=[Depends(security.require_service_auth)])
async def register_face(payload: RegisterPayload):
    try:
        image = face_service.decode_image(payload.image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    quality = face_service.check_quality(image)
    if not quality["ok"]:
        raise HTTPException(status_code=422, detail=quality["reason"])

    result = face_service.extract_embedding(image)
    if not result["ok"]:
        raise HTTPException(status_code=422, detail=result["error"])

    row = db.insert_embedding(payload.user_id, result["embedding"], settings.face_model, payload.image_url)
    db.mark_user_verified(payload.user_id)

    return {
        "success": True,
        "embedding_id": row["id"],
        "dimension": len(result["embedding"]),
    }


@app.post("/api/v1/face/verify", dependencies=[Depends(security.require_service_auth)])
async def verify_face(payload: VerifyPayload):
    try:
        image = face_service.decode_image(payload.image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    enrollments = db.fetch_active_embeddings(payload.user_id)
    if not enrollments:
        raise HTTPException(status_code=404, detail="No enrollment found for user")

    result = face_service.verify_image(
        image,
        [e["embedding"] for e in enrollments],
        payload.threshold,
    )
    if not result["ok"]:
        raise HTTPException(status_code=422, detail=result["error"])

    if payload.log_attendance and result["matched"]:
        db.log_attendance(
            payload.user_id,
            result["confidence"],
            payload.liveness_score or 0.0,
        )

    return {"success": True, "user_id": payload.user_id, **result}


@app.post("/api/v1/face/identify", dependencies=[Depends(security.require_service_auth)])
async def identify_face(payload: IdentifyPayload):
    try:
        image = face_service.decode_image(payload.image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    candidates = db.fetch_active_embeddings()
    if not candidates:
        raise HTTPException(status_code=404, detail="No enrollments found")

    result = face_service.identify_image(image, candidates, payload.threshold)
    if not result["ok"]:
        raise HTTPException(status_code=422, detail=result["error"])

    return {"success": True, **result}


@app.websocket("/api/v1/ws/liveness")
async def liveness_socket(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    if not security.verify_ws_token(token, settings.service_api_secret):
        await websocket.close(code=4001)
        return
    await ws.liveness_handler(websocket)
