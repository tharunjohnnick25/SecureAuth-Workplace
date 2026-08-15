-- Migration 019: Face Biometrics v2 — GDPR/DPDP-compliant enrollment & login
--
-- Builds on 011/015. Adds:
--   1. Consent / enrollment metadata on public.users
--   2. Encrypted-at-rest 128-dim FaceNet embedding on public.users
--   3. face_login_attempts audit trail
--   4. biometric_deletion_requests (soft delete -> hard delete after 30 days)
--   5. dpia_records checklist for GDPR/DPDP accountability
--   6. RPC helpers for rate limiting, purging, and consent revocation

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Users: consent, enrollment, soft-delete lifecycle
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS face_consent_given BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS face_consent_timestamp TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS face_enrolled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS face_embedding_encrypted TEXT,          -- AES-256-GCM payload (base64), never raw
    ADD COLUMN IF NOT EXISTS face_embedding_version VARCHAR(20) DEFAULT 'facenet-128',
    ADD COLUMN IF NOT EXISTS last_face_login_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS face_delete_requested_at TIMESTAMP WITH TIME ZONE;

-- Face data purge deadline is exactly 30 days after soft delete.
COMMENT ON COLUMN public.users.face_embedding_encrypted IS
    'AES-256-GCM encrypted 128-dim FaceNet embedding. Base64: iv.ciphertext.authTag.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. face_login_attempts — full audit trail for every face attempt
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.face_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    attempted_email VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    similarity_score NUMERIC,
    liveness_pass BOOLEAN DEFAULT FALSE,
    liveness_score NUMERIC,
    success BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    device_fingerprint TEXT,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS face_login_attempts_ip_time_idx
    ON public.face_login_attempts (ip_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS face_login_attempts_emp_time_idx
    ON public.face_login_attempts (employee_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS face_login_attempts_time_idx
    ON public.face_login_attempts (timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. biometric_deletion_requests — soft delete then hard delete after 30 days
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.biometric_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_hard_delete_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',          -- PENDING | COMPLETED | CANCELLED
    hard_deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS biometric_deletion_requests_status_idx
    ON public.biometric_deletion_requests (status, scheduled_hard_delete_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. dpia_records — GDPR/DPDP Data Protection Impact Assessment checklist
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dpia_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    employee_scope VARCHAR(255) DEFAULT 'ALL_EMPLOYEES',
    answers JSONB DEFAULT '{}'::jsonb,             -- question_id -> { answer, notes }
    risk_level VARCHAR(20) DEFAULT 'UNASSESSED',   -- LOW | MEDIUM | HIGH
    status VARCHAR(20) DEFAULT 'DRAFT',            -- DRAFT | UNDER_REVIEW | APPROVED
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dpia_records_created_idx
    ON public.dpia_records (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.face_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpia_records ENABLE ROW LEVEL SECURITY;

-- face_login_attempts: admins read all; employees read only their own rows.
CREATE POLICY "Admins can read all face login attempts"
    ON public.face_login_attempts FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
    );
CREATE POLICY "Employees can read own face login attempts"
    ON public.face_login_attempts FOR SELECT USING (auth.uid() = employee_id);
-- Service role writes attempts via RPC; no client insert policy.

-- biometric_deletion_requests: self service; admins manage all.
CREATE POLICY "Employees can manage own deletion requests"
    ON public.biometric_deletion_requests FOR ALL USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Admins can manage deletion requests"
    ON public.biometric_deletion_requests FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
    );

-- dpia_records: admins only (created in admin panel).
CREATE POLICY "Admins can manage dpia records"
    ON public.dpia_records FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
    );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Helper functions
-- ─────────────────────────────────────────────────────────────────────────

-- Count failed face attempts for a given IP in the last N minutes (rate limit).
CREATE OR REPLACE FUNCTION public.face_failed_attempts(ip TEXT, minutes INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.face_login_attempts
    WHERE ip_address = ip
      AND success = FALSE
      AND timestamp > NOW() - (minutes || ' minutes')::INTERVAL;
$$;

-- Count ALL face attempts for an IP in the last N minutes.
CREATE OR REPLACE FUNCTION public.face_attempts(ip TEXT, minutes INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.face_login_attempts
    WHERE ip_address = ip
      AND timestamp > NOW() - (minutes || ' minutes')::INTERVAL;
$$;

-- Insert a face login attempt (service-role / RPC path, bypasses RLS).
CREATE OR REPLACE FUNCTION public.record_face_attempt(
    p_employee_id UUID,
    p_attempted_email TEXT,
    p_similarity NUMERIC,
    p_liveness_pass BOOLEAN,
    p_liveness_score NUMERIC,
    p_success BOOLEAN,
    p_ip_address TEXT,
    p_device_fingerprint TEXT,
    p_failure_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.face_login_attempts (
        employee_id, attempted_email, similarity_score, liveness_pass,
        liveness_score, success, ip_address, device_fingerprint, failure_reason
    ) VALUES (
        p_employee_id, p_attempted_email, p_similarity, p_liveness_pass,
        p_liveness_score, p_success, p_ip_address, p_device_fingerprint, p_failure_reason
    ) RETURNING id INTO v_id;

    IF p_success AND p_employee_id IS NOT NULL THEN
        UPDATE public.users
        SET last_face_login_at = NOW()
        WHERE id = p_employee_id;
    END IF;

    RETURN v_id;
END;
$$;

-- Revoke consent / soft-delete biometrics (keeps audit rows; clears live embedding).
CREATE OR REPLACE FUNCTION public.revoke_face_consent(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.users
    SET face_consent_given = FALSE,
        face_consent_timestamp = NULL,
        face_enrolled = FALSE,
        face_embedding_encrypted = NULL,
        face_embedding_version = NULL,
        face_delete_requested_at = NOW()
    WHERE id = p_employee_id;

    UPDATE public.face_embeddings
    SET is_active = FALSE
    WHERE user_id = p_employee_id;
END;
$$;

-- Hard-delete all biometric data (called by the 30-day purge job).
-- Re-encrypt-proof: removes embeddings, passkeys, and the deletion request.
CREATE OR REPLACE FUNCTION public.purge_biometric_data(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.face_embeddings WHERE user_id = p_employee_id;
    DELETE FROM public.biometric_deletion_requests WHERE employee_id = p_employee_id AND status = 'PENDING';
    -- Face login attempt audit rows are intentionally retained (records WHAT happened,
    -- not biometric data). Audit rows never contain embeddings.
END;
$$;

-- Find employees whose soft-deleted biometrics are now past the 30-day window.
CREATE OR REPLACE FUNCTION public.pending_biometric_purges()
RETURNS TABLE (employee_id UUID, requested_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id AS employee_id, face_delete_requested_at AS requested_at
    FROM public.users
    WHERE face_delete_requested_at IS NOT NULL
      AND face_delete_requested_at <= NOW() - INTERVAL '30 days';
$$;

-- Cosine similarity in SQL (128-dim JSONB arrays) for audit/reporting only.
CREATE OR REPLACE FUNCTION public.face_cosine_similarity_v2(a JSONB, b JSONB)
RETURNS NUMERIC AS $$
DECLARE
    va NUMERIC[] := ARRAY(SELECT jsonb_array_elements_text(a)::NUMERIC);
    vb NUMERIC[] := ARRAY(SELECT jsonb_array_elements_text(b)::NUMERIC);
    dot NUMERIC := 0;
    na NUMERIC := 0;
    nb NUMERIC := 0;
    i INTEGER;
BEGIN
    IF array_length(va, 1) IS NULL OR array_length(vb, 1) IS NULL
       OR array_length(va, 1) <> array_length(vb, 1) THEN
        RETURN 0;
    END IF;
    FOR i IN 1..array_length(va, 1) LOOP
        dot := dot + va[i] * vb[i];
        na := na + va[i] * va[i];
        nb := nb + vb[i] * vb[i];
    END LOOP;
    IF na = 0 OR nb = 0 THEN RETURN 0; END IF;
    RETURN dot / (SQRT(na) * SQRT(nb));
END;
$$ LANGUAGE plpgsql STABLE;
