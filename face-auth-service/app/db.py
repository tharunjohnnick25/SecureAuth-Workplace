from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator, Optional

import psycopg2
import psycopg2.extras

from .config import get_settings


@contextmanager
def get_connection() -> Iterator:
    settings = get_settings()
    conn = psycopg2.connect(
        settings.database_url,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    try:
        yield conn
    finally:
        conn.close()


def fetch_active_embeddings(user_id: Optional[str] = None) -> list[dict]:
    query = (
        "SELECT id, user_id, embedding, embedding_vector, image_url "
        "FROM public.face_embeddings WHERE is_active = TRUE"
    )
    params: list[str] = []
    if user_id:
        query += " AND user_id = %s"
        params.append(user_id)

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return [dict(row) for row in rows]


def insert_embedding(
    user_id: str,
    embedding: list[float],
    model: str,
    image_url: Optional[str] = None,
) -> dict:
    vector_literal = "[" + ",".join(repr(float(v)) for v in embedding) + "]"
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO public.face_embeddings
                (user_id, embedding, embedding_vector, model, image_url)
            VALUES (%s, %s, %s::vector, %s, %s)
            RETURNING id
            """,
            (
                user_id,
                psycopg2.extras.Json(embedding),
                vector_literal,
                model,
                image_url,
            ),
        )
        row = cur.fetchone()
        conn.commit()
    return dict(row)


def mark_user_verified(user_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE public.users SET is_verified = TRUE WHERE id = %s",
            (user_id,),
        )
        conn.commit()


def log_attendance(
    user_id: str,
    verification_score: float,
    liveness_score: float,
    method: str = "FACE",
    image_url: Optional[str] = None,
    device_info: Optional[dict] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO public.attendance_records
                (employee_id, date, check_in, status, verification_status,
                 verification_method, verification_score, liveness_score,
                 captured_image_url, device_info, lat, lon, location_valid)
            VALUES
                (%s, CURRENT_DATE, NOW(), 'present', 'VERIFIED',
                 %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (employee_id, date) DO UPDATE SET
                verification_status = 'VERIFIED',
                verification_method = EXCLUDED.verification_method,
                verification_score = EXCLUDED.verification_score,
                liveness_score = EXCLUDED.liveness_score,
                captured_image_url = EXCLUDED.captured_image_url,
                device_info = EXCLUDED.device_info,
                lat = EXCLUDED.lat,
                lon = EXCLUDED.lon,
                location_valid = EXCLUDED.location_valid
            """,
            (
                user_id,
                method,
                verification_score,
                liveness_score,
                image_url,
                psycopg2.extras.Json(device_info or {}),
                lat,
                lon,
                lat is not None and lon is not None,
            ),
        )
        conn.commit()
