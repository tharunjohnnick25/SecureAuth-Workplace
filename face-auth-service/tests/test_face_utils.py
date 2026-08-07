import numpy as np
import pytest

from app import face_service
from app import security


def test_quality_rejects_blank_image():
    blank = np.zeros((300, 300, 3), dtype=np.uint8)
    result = face_service.check_quality(blank)
    assert result["ok"] is False


def test_similarity_perfect_match():
    vec = [0.1, 0.2, 0.3, 0.4, 0.5]
    assert face_service.similarity(vec, vec) == pytest.approx(1.0)


def test_similarity_orthogonal():
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert face_service.similarity(a, b) == pytest.approx(0.0)


def test_verify_image_threshold():
    image = np.zeros((300, 300, 3), dtype=np.uint8)
    stored = [0.0] * 512
    result = face_service.verify_image(image, stored, threshold=70.0)
    assert result["ok"] is False


def test_signature_verifies():
    secret = "test-secret"
    body = b'{"image":"abc"}'
    timestamp = "0"
    sig = security.sign("POST", "/api/v1/face/extract", body, secret, timestamp)
    assert security.verify_signature("POST", "/api/v1/face/extract", body, timestamp, sig, secret) is True
    assert security.verify_signature("POST", "/api/v1/face/extract", body, timestamp, "deadbeef", secret) is False


def test_ws_token_roundtrip():
    secret = "test-secret"
    token = security.issue_ws_token(secret)
    assert security.verify_ws_token(token, secret) is True
    assert security.verify_ws_token(token, "wrong-secret") is False
