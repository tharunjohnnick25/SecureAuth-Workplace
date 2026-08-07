from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Face Auth Service"
    env: str = "development"
    debug: bool = False

    service_api_secret: str = "change-me"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    face_model: str = "Facenet"
    face_detector_backend: str = "opencv"
    match_threshold: float = 70.0
    liveness_required: bool = True
    liveness_frames: int = 3
    max_frame_bytes: int = 3_000_000

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
