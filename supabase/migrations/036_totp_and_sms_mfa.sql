-- Migration 036: TOTP and SMS OTP Mobile MFA Integration

-- 1. Extend public.users table for phone verification and MFA flags
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sms_mfa_enabled BOOLEAN DEFAULT FALSE;

-- Ensure audit_logs has company_id column if not present
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Create OTP Challenges table for phone verification, SMS MFA, and phone changes
CREATE TABLE IF NOT EXISTS public.otp_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID,
    phone VARCHAR(20) NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'PHONE_VERIFICATION', 'SMS_MFA', 'PHONE_CHANGE'
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for high performance lookup
CREATE INDEX IF NOT EXISTS idx_otp_challenges_user_purpose ON public.otp_challenges(user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone_created ON public.otp_challenges(phone, created_at DESC);

-- 4. Enable RLS on otp_challenges
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own otp challenges" ON public.otp_challenges;
CREATE POLICY "Users can view own otp challenges" ON public.otp_challenges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages otp challenges" ON public.otp_challenges;
CREATE POLICY "Service role manages otp challenges" ON public.otp_challenges FOR ALL USING (true);
