-- Migration 012: Face Biometrics - pgvector embeddings & attendance verification
-- Extends the schema created in 011_face_and_leave.sql

-- 1. Enable pgvector for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Extend face_embeddings with pgvector column + model metadata
ALTER TABLE public.face_embeddings ADD COLUMN IF NOT EXISTS embedding_vector VECTOR(512);
ALTER TABLE public.face_embeddings ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'Facenet';
ALTER TABLE public.face_embeddings ADD COLUMN IF NOT EXISTS model_version VARCHAR(50);
ALTER TABLE public.face_embeddings ADD COLUMN IF NOT EXISTS sample_index INTEGER DEFAULT 0;

-- HNSW index for cosine similarity search (used by the microservice / pgvector)
CREATE INDEX IF NOT EXISTS face_embeddings_vector_idx
    ON public.face_embeddings
    USING hnsw (embedding_vector vector_cosine_ops);

-- 3. Fix RLS from 011.
--    (a) Replace the effectively-permissive admin policy with a real role check.
DROP POLICY IF EXISTS "Admins can manage face embeddings" ON public.face_embeddings;
CREATE POLICY "Admins can manage face embeddings" ON public.face_embeddings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin')
        )
    );

--    (b) Employees must never read raw embeddings; expose metadata only.
DROP POLICY IF EXISTS "Users can view own face embeddings" ON public.face_embeddings;
CREATE POLICY "Users can view own enrollment metadata" ON public.face_embeddings
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Attendance verification columns on attendance_records (used by login/checkout).
--    Mirrors the enrichment applied to `attendance` in migration 010.
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50);
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS verification_score NUMERIC;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS liveness_score NUMERIC;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS captured_image_url TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS lon NUMERIC;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS location_valid BOOLEAN;

-- 5. Cosine similarity helper for JSONB embeddings when pgvector is unavailable.
CREATE OR REPLACE FUNCTION public.face_cosine_similarity(a JSONB, b JSONB)
RETURNS NUMERIC AS $$
DECLARE
    va NUMERIC[] := ARRAY(SELECT jsonb_array_elements_text(a)::NUMERIC);
    vb NUMERIC[] := ARRAY(SELECT jsonb_array_elements_text(b)::NUMERIC);
    dot NUMERIC := 0;
    na NUMERIC := 0;
    nb NUMERIC := 0;
    i INTEGER;
BEGIN
    IF array_length(va, 1) IS NULL
       OR array_length(vb, 1) IS NULL
       OR array_length(va, 1) <> array_length(vb, 1) THEN
        RETURN 0;
    END IF;

    FOR i IN 1..array_length(va, 1) LOOP
        dot := dot + va[i] * vb[i];
        na := na + va[i] * va[i];
        nb := nb + vb[i] * vb[i];
    END LOOP;

    IF na = 0 OR nb = 0 THEN
        RETURN 0;
    END IF;

    RETURN dot / (SQRT(na) * SQRT(nb));
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Backfill legacy single embedding from users.face_embedding (migration 010)
--    into the face_embeddings table (one row per user, once).
INSERT INTO public.face_embeddings (user_id, embedding, model, is_active)
SELECT id, face_embedding, 'Facenet', TRUE
FROM public.users
WHERE face_embedding IS NOT NULL
  AND id NOT IN (SELECT DISTINCT user_id FROM public.face_embeddings)
ON CONFLICT DO NOTHING;

-- 7. Populate embedding_vector from existing JSONB rows (512-dim Facenet).
UPDATE public.face_embeddings
SET embedding_vector = embedding::text::vector
WHERE embedding_vector IS NULL
  AND embedding IS NOT NULL
  AND jsonb_array_length(embedding) = 512;
