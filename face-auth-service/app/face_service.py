import base64
import logging
from typing import Optional

import cv2
import numpy as np

import face_utils

from .config import get_settings

logger = logging.getLogger("uvicorn.error")


def decode_image(data: str | bytes) -> np.ndarray:
    if isinstance(data, str):
        if data.startswith("data:"):
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
    else:
        raw = data

    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image


def check_quality(image: np.ndarray) -> dict:
    ok, reason = face_utils.check_image_quality(image)
    return {"ok": ok, "reason": reason}


def extract_embedding(image: np.ndarray) -> dict:
    embedding, error = face_utils.extract_face_embedding(image)
    if error:
        return {"ok": False, "error": error}
    return {"ok": True, "embedding": embedding}


def similarity(vec1, vec2) -> float:
    a = np.asarray(vec1, dtype=np.float64)
    b = np.asarray(vec2, dtype=np.float64)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def verify_image(image: np.ndarray, stored_embeddings: list, threshold: Optional[float] = None) -> dict:
    result = extract_embedding(image)
    if not result["ok"]:
        return {"ok": False, "error": result["error"]}

    scores = [similarity(result["embedding"], stored) for stored in stored_embeddings]
    best = max(scores) if scores else 0.0
    threshold = threshold if threshold is not None else get_settings().match_threshold
    confidence = round(best * 100, 2)

    return {
        "ok": True,
        "matched": confidence >= threshold,
        "confidence": confidence,
        "threshold": threshold,
    }


def identify_image(image: np.ndarray, candidates: list[dict], threshold: Optional[float] = None) -> dict:
    result = extract_embedding(image)
    if not result["ok"]:
        return {"ok": False, "error": result["error"]}

    scored = [
        {"user_id": c["user_id"], "embedding_id": c["id"], "score": round(similarity(result["embedding"], c["embedding"]) * 100, 2)}
        for c in candidates
    ]
    scored.sort(key=lambda item: item["score"], reverse=True)

    threshold = threshold if threshold is not None else get_settings().match_threshold
    top = scored[0] if scored else None
    return {
        "ok": True,
        "matched": bool(top and top["score"] >= threshold),
        "top_candidate": top,
        "candidates": scored,
        "threshold": threshold,
    }


def warm_up() -> None:
    try:
        from deepface import DeepFace

        DeepFace.build_model(get_settings().face_model)
        logger.info("Warmed up face model: %s", get_settings().face_model)
    except Exception as exc:
        logger.warning("Face model warm-up failed: %s", exc)


def shutdown() -> None:
    logger.info("Shutting down face service")
