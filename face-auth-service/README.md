# Face Auth Service

FastAPI microservice for the Enterprise Face Detection & Verification System. Owns all computer-vision work (OpenCV + DeepFace) and real-time liveness detection, alongside the Next.js application.

> See `../face_verification_plan.md` for the full implementation plan.

## Getting started

```bash
cd face-auth-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # fill in DATABASE_URL + FACE_SERVICE_API_SECRET
uvicorn app.main:app --reload
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Healthcheck + model warm-up |
| POST | `/api/v1/face/extract` | Quality gate + 512-dim embedding |
| POST | `/api/v1/face/register` | Extract + persist enrollment, mark user verified |
| POST | `/api/v1/face/verify` | Match vs a user's enrollments; optional attendance upsert |
| POST | `/api/v1/face/identify` | 1:N match across all active enrollments |
| WS | `/api/v1/ws/liveness` | Streaming antispoof + blink challenge |

All REST endpoints require service-to-service auth: HMAC-SHA256 of `METHOD\nPATH\nTIMESTAMP\nBODY` sent as `X-Timestamp` / `X-Signature` headers, computed with `FACE_SERVICE_API_SECRET`. The WebSocket endpoint requires a short-lived `token` query param from `security.issue_ws_token`.

Example signing (Node/Next.js):

```ts
function sign(method: string, path: string, body: string, secret: string, timestamp: string) {
  const msg = `${method}\n${path}\n${timestamp}\n${body}`;
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}
```

## Liveness protocol

```jsonc
client → {"frame": "<base64>"}
server → {"event":"start","required_frames":3}
server → {"event":"frame","frame_index":1,"is_real":true,"antispoof_score":0.97,"blinks":0}
server → {"event":"complete","passed":true,"average_antispoof_score":0.95,"blinks":2}
```

## Env vars

See `.env.example`. Key ones: `DATABASE_URL` (Supabase pooled Postgres), `FACE_SERVICE_API_SECRET`, `FACE_MATCH_THRESHOLD` (default 70).

## Tests

```bash
pytest
```

## Notes

- The service talks to Postgres via the service role (RLS bypassed). Embeddings are never returned to browsers.
- First startup downloads the DeepFace/Facenet model; warm it with a `/health` call.
- `face_utils.py` is shared and kept at the service root; run uvicorn from this directory.
