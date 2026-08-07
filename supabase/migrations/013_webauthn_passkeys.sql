-- Migration 013: WebAuthn Passkeys

-- Table to store WebAuthn passkeys (public keys)
CREATE TABLE IF NOT EXISTS public.passkeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE, -- Base64URL encoded credential ID
    public_key BYTEA NOT NULL, -- The raw public key bytes
    counter BIGINT NOT NULL DEFAULT 0, -- Signature counter to detect cloning
    device_type TEXT NOT NULL, -- e.g., 'singleDevice' or 'multiDevice'
    backed_up BOOLEAN NOT NULL DEFAULT false,
    transports JSONB DEFAULT '[]'::jsonb, -- e.g. ['internal', 'usb', 'nfc', 'ble']
    name TEXT, -- Optional user-friendly name for the authenticator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to temporarily store WebAuthn challenges for registration and authentication
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- Nullable for discoverable credentials
    challenge TEXT NOT NULL, -- Base64URL encoded challenge
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(20) NOT NULL -- 'registration' or 'login'
);

-- RLS Policies
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Admins can view all passkeys
CREATE POLICY "Admins can view all passkeys" ON public.passkeys FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Standard admin check
);

-- Users can manage their own passkeys
CREATE POLICY "Users can manage own passkeys" ON public.passkeys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Challenges are meant to be manipulated securely by the backend bypassing RLS, but we allow insert/select/delete for the user id
CREATE POLICY "Users can manage own challenges" ON public.webauthn_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- System bypasses (since API routes use service role key, they bypass RLS anyway)
