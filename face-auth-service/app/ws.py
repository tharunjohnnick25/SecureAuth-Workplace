import json

import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from . import face_service, liveness
from .config import get_settings


async def liveness_handler(websocket: WebSocket) -> None:
    settings = get_settings()
    await websocket.accept()

    frames_seen = 0
    required_frames = settings.liveness_frames
    checks_ok = 0
    total_score = 0.0
    blink_detector = liveness.BlinkDetector()

    try:
        await websocket.send_json(
            {"event": "start", "required_frames": required_frames}
        )

        while frames_seen < required_frames:
            message = await websocket.receive_text()
            if message == "__done__":
                break

            try:
                payload = json.loads(message)
                frame = face_service.decode_image(payload.get("frame", ""))
            except Exception:
                await websocket.send_json({"event": "error", "detail": "Invalid frame"})
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blinks = blink_detector.detect(gray)
            anti = liveness.antispoof(frame)

            frames_seen += 1
            total_score += anti.get("score", 0.0)
            if anti.get("ok"):
                checks_ok += 1

            await websocket.send_json(
                {
                    "event": "frame",
                    "frame_index": frames_seen,
                    "is_real": anti.get("ok"),
                    "antispoof_score": anti.get("score"),
                    "blinks": blinks,
                }
            )

        average_score = round(total_score / frames_seen, 2) if frames_seen else 0.0
        passed = checks_ok >= required_frames and blink_detector.blinks >= 1
        await websocket.send_json(
            {
                "event": "complete",
                "passed": passed,
                "average_antispoof_score": average_score,
                "blinks": blink_detector.blinks,
            }
        )
    except WebSocketDisconnect:
        return
