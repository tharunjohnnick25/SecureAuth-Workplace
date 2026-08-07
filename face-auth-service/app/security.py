import hashlib
import hmac
import time

from fastapi import Header, HTTPException, Request

from .config import get_settings


def _canonical(method: str, path: str, body: bytes, timestamp: str) -> str:
    return f"{method}\n{path}\n{timestamp}\n{body.decode('utf-8', 'replace')}"


def sign(method: str, path: str, body: bytes, secret: str, timestamp: str) -> str:
    message = _canonical(method, path, body, timestamp)
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


def verify_signature(
    method: str,
    path: str,
    body: bytes,
    timestamp: str,
    signature: str,
    secret: str,
    max_age_seconds: int = 300,
) -> bool:
    try:
        if abs(time.time() - float(timestamp)) > max_age_seconds:
            return False
    except (TypeError, ValueError):
        return False

    expected = sign(method, path, body, secret, timestamp)
    return hmac.compare_digest(expected, signature)


def issue_ws_token(secret: str, scope: str = "liveness", ttl_seconds: int = 300) -> str:
    expiry = int(time.time()) + ttl_seconds
    payload = f"{scope}:{expiry}"
    digest = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{digest}"


def verify_ws_token(token: str, secret: str, scope: str = "liveness") -> bool:
    try:
        payload, _, digest = token.rpartition(".")
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(digest, expected):
            return False
        token_scope, _, expiry = payload.partition(":")
        if token_scope != scope:
            return False
        return int(time.time()) < int(expiry)
    except (ValueError, AttributeError):
        return False


async def require_service_auth(
    request: Request,
    x_timestamp: str = Header(default=""),
    x_signature: str = Header(default=""),
) -> bool:
    settings = get_settings()
    if not settings.service_api_secret:
        raise HTTPException(status_code=500, detail="Service secret not configured")

    body = await request.body()
    if not verify_signature(
        request.method,
        request.url.path,
        body,
        x_timestamp,
        x_signature,
        settings.service_api_secret,
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")
    return True
