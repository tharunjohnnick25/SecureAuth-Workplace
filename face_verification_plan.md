# Enterprise Face Detection & Verification System — Implementation Plan

## Goal Description
Replace the current **simulated** face verification (a 2-second camera spinner in `components/auth/EmployeeLogin.tsx`) with a real, enterprise-grade biometric pipeline:

1. A **Python FastAPI microservice** (`face-auth-service/`) that performs computer-vision work (OpenCV + DeepFace): face detection, quality gating, embedding extraction, and similarity matching.
2. **WebSockets** for real-time liveness detection (antispoofing + blink challenge) during login and enrollment.
3. **PostgreSQL (Supabase) schema updates** to store facial embeddings (`pgvector`) and enriched attendance/verification records.
4. Next.js **server-side proxy routes** so the browser never talks to the CV service directly.

`implementation_plan.md` remains the (already-shipped) HRMS & IAM plan; this document is the plan for the biometric layer.

---

## Current State (verified against the repo)

| Area | Location | Status |
| --- | --- | --- |
| Face utils (quality + embedding + match) | `face-auth-service/face_utils.py` | Exists, DeepFace/Facenet, JSONB-oriented |
| FastAPI app | `face-auth-service/app/` | **Does not exist yet** |
| `face_embeddings` table | `supabase/migrations/011_face_and_leave.sql` | Exists, `embedding JSONB`, weak RLS |
| Legacy single embedding | `users.face_embedding JSONB` (migration 010) | Deprecated, still written by `app/api/security/face-register/route.ts` |
| Login attendance | `app/api/auth/login/route.ts` | Writes `attendance_records` on login |
| Attendance schema | `attendance_records` + `attendance` | **Two tables, needs consolidation** |
| UI face verification | `components/auth/EmployeeLogin.tsx` | **Simulated** (setTimeout, no matching) |

---

## Architecture

```
Browser / Next.js App
   │  getUserMedia frames (base64)
   ▼
Next.js Server Routes (app/api/face/*)     ← service-to-service only, HMAC-signed
   │
   ▼
FastAPI Microservice  (face-auth-service)
   ├── /api/v1/face/extract        OpenCV quality gate + DeepFace embedding
   ├── /api/v1/face/register       extract + persist to face_embeddings
   ├── /api/v1/face/verify         cosine match vs a user's enrollments
   ├── /api/v1/face/identify       1:N match vs all active enrollments
   └── WS /api/v1/ws/liveness      streaming antispoof + blink challenge
   │
   ▼
PostgreSQL (Supabase) — service-role access
   ├── public.face_embeddings      (pgvector VECTOR(512) + JSONB fallback)
   ├── public.attendance_records   (verification columns)
   └── public.users.is_verified
```

Security model:
- The CV service is **never public**. Only Next.js server routes can reach it.
- Requests are authenticated with an **HMAC-SHA256 signature** over `METHOD\nPATH\nTIMESTAMP\nBODY` using `FACE_SERVICE_API_SECRET`.
- The microservice talks to Postgres with the **service role** (bypasses RLS); embeddings are never exposed to clients.
- WebSocket connections are authorized with a short-lived signed `token` query param.

---

## Component Changes

### A. FastAPI Microservice (`face-auth-service/`) — NEW
```
face-auth-service/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app, lifespan model warm-up, routes
│   ├── config.py          # pydantic-settings, env-driven
│   ├── schemas.py         # request/response models
│   ├── db.py              # psycopg2 → Supabase Postgres (embeddings, attendance)
│   ├── security.py        # HMAC service-to-service auth dependency
│   ├── face_service.py    # decode → quality → embedding → similarity
│   ├── liveness.py        # antispoof (DeepFace) + blink detector
│   └── ws.py              # WebSocket liveness state machine
├── face_utils.py          # existing — keep as-is
├── requirements.txt       # pinned
├── .env.example
├── Dockerfile
├── render.yaml
├── README.md
└── tests/
```

Endpoints (all JSON; images as base64 `data:` URL or raw base64):
- `GET /health` — healthcheck (also warms the model via lifespan).
- `POST /api/v1/face/extract` — quality gate (blur/brightness), detect exactly one face, return 512-dim embedding.
- `POST /api/v1/face/register` — extract + insert `face_embeddings` row + mark `users.is_verified`.
- `POST /api/v1/face/verify` — match live image against a user's active enrollments; optional attendance upsert.
- `POST /api/v1/face/identify` — 1:N match, returns top candidate + confidence.
- `WS /api/v1/ws/liveness` — frame-in/status-out protocol below.

WebSocket liveness protocol:
```
client → {"frame": "<base64>"}
server → {"event":"start","required_frames":3}
server → {"event":"frame","frame_index":n,"is_real":bool,"antispoof_score":float,"blinks":int}
server → {"event":"complete","passed":bool,"average_antispoof_score":float,"blinks":int}
```
Pass = `is_real` on all required frames **and** ≥1 blink detected (OpenCV eye-cascade; dlib landmark upgrade is a drop-in).

### B. Database Migration (`supabase/migrations/012_face_biometrics.sql`) — NEW
Extends `011_face_and_leave.sql`:
1. `CREATE EXTENSION IF NOT EXISTS vector;`
2. Add to `public.face_embeddings`: `embedding_vector VECTOR(512)`, `model`, `model_version`, `sample_index`; HNSW index `(embedding_vector vector_cosine_ops)`.
3. **Fix RLS:** drop the effectively-permissive admin policy from 011; add a real admin role check; replace "view own" with a metadata-only self policy (never leak raw embeddings to clients).
4. Add verification columns to `public.attendance_records`: `verification_status`, `verification_method`, `verification_score`, `liveness_score`, `captured_image_url`, `lat`, `lon`, `device_info`, `location_valid`.
5. `face_cosine_similarity(a JSONB, b JSONB)` helper for environments without pgvector.
6. Backfill `face_embeddings` from legacy `users.face_embedding` and populate `embedding_vector` from existing JSONB rows.

### C. Next.js Integration (documented; wiring in a follow-up)
- **[NEW]** `app/api/face/extract|register|verify|identify/route.ts` — HMAC-signed proxies to the microservice.
- **[MODIFY]** `components/auth/EmployeeLogin.tsx` — replace `triggerDeviceAuth` simulation with: capture frame → WS liveness → POST verify (which upserts `attendance_records`).
- **[MODIFY]** `components/pages/AdminDashboard.tsx` new-employee flow — capture 1+ enrollment frames → POST register.
- **[MODIFY]** `app/api/security/face-register/route.ts` — write to `face_embeddings` (via microservice) instead of legacy `users.face_embedding`.
- **[CONSOLIDATE]** `attendance_records` vs `attendance` — settle on `attendance_records` (it's what login/checkout use) and port the `attendance` enhancement columns.

### D. Deployment
- `face-auth-service/render.yaml` + `Dockerfile` for a separate Render service (Python runtime, `uvicorn app.main:app`).
- Root `render.yaml` gains a `secureauth-face-service` block.
- Env vars: `FACE_SERVICE_API_SECRET`, `DATABASE_URL` (Supabase pooled), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FACE_MATCH_THRESHOLD`.

---

## Open Questions — Resolved

**1. Embeddings storage: pgvector vs JSONB?**
Use **pgvector `VECTOR(512)`** for `face_embeddings.embedding_vector` with an HNSW index — enables future SQL-side KNN search and mirrors the "enterprise" goal. Keep the existing `embedding JSONB` column as a portability/backfill fallback. Facenet produces 512 dims, so the column matches the model.

**2. DeepFace vs alternatives?**
Keep **DeepFace (Facenet)** for the skeleton — it's what `face_utils.py` already uses and it ships an antispoof model. Documented upgrade path: **insightface ArcFace (`buffalo_l`) + retinaface** for production (smaller, faster, more accurate). The `face_service.py` seam keeps model swaps localized.

**3. Matching threshold?**
Cosine similarity scaled to percent; start at **70%** (Facenet convention) and tune per-enrollment in staging. Configurable via `FACE_MATCH_THRESHOLD` / per-request `threshold`.

**4. Liveness approach?**
DeepFace `anti_spoofing=True` frame scoring **plus** a blink challenge over the WS stream. Modes: `REQUIRED` (production), `BYPASS` (dev, mirrors existing `NEXT_PUBLIC_MOCK_AUTH`).

**5. Attendance write path?**
The microservice upserts `attendance_records` (single row per `employee_id,date`) with verification metadata — no new `attendance_logs` table, no duplicate rows.

---

## Verification Plan

### Automated
- `pytest face-auth-service/tests` — quality-gate unit tests, similarity/matching, endpoint smoke tests (DB functions monkeypatched).
- `python -m compileall face-auth-service/app` — syntax gate in CI.
- Existing `npm run build` for Next.js (unchanged in this phase).

### Manual
1. Enroll: admin captures face → POST register → row in `face_embeddings`, `users.is_verified=true`.
2. Login: employee ID + face → WS liveness passes → verify matched → `attendance_records` row with `verification_status='VERIFIED'`, score, liveness.
3. Negative: wrong face fails; photo/print fails antispoof.
4. Checkout writes `check_out` (unchanged route).

---

## Phasing
1. **Phase 1 (this deliverable):** plan + migration `012` + FastAPI skeleton + deployment files.
2. **Phase 2:** Next.js proxy routes + replace simulated verification + enrollment wiring.
3. **Phase 3:** attendance table consolidation, thresholds tuning, insightface swap if needed, load test (`load-test/`).
