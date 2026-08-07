from typing import Optional

from pydantic import BaseModel


class ImagePayload(BaseModel):
    image: str


class RegisterPayload(ImagePayload):
    user_id: str
    image_url: Optional[str] = None


class VerifyPayload(ImagePayload):
    user_id: str
    threshold: Optional[float] = None
    liveness_score: Optional[float] = None
    log_attendance: bool = True


class IdentifyPayload(ImagePayload):
    threshold: Optional[float] = None
