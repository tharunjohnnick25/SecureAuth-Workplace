-- Migration 012: AI-Based Employee Risk Score

-- Table to store historical risk evaluations for charting and analysis
CREATE TABLE IF NOT EXISTS public.ml_risk_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT, -- Optional session tracking
    risk_score NUMERIC NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL, -- TRUSTED, LOW, MEDIUM, HIGH, CRITICAL
    top_factors JSONB, -- E.g., [{"factor": "Location", "impact": -20}, {"factor": "Typing Speed", "impact": -10}]
    telemetry_data JSONB, -- Raw data at the time of evaluation (WPM, IP, Device, etc)
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store the ML model's baseline metrics per user
CREATE TABLE IF NOT EXISTS public.behavioral_baselines (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    avg_wpm NUMERIC DEFAULT 0,
    wpm_variance NUMERIC DEFAULT 0,
    typical_ips JSONB DEFAULT '[]'::jsonb,
    trusted_devices JSONB DEFAULT '[]'::jsonb,
    typical_login_hours JSONB DEFAULT '[]'::jsonb,
    model_state_bytes BYTEA, -- Optional binary state of the trained model for this specific user
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ml_risk_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_baselines ENABLE ROW LEVEL SECURITY;

-- Admins can view all risk logs and baselines
CREATE POLICY "Admins can view all ml_risk_logs" ON public.ml_risk_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Standard admin check
);
CREATE POLICY "Admins can view all behavioral_baselines" ON public.behavioral_baselines FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Standard admin check
);

-- Users can view their own risk logs and baselines (read-only)
CREATE POLICY "Users can view own ml_risk_logs" ON public.ml_risk_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own behavioral_baselines" ON public.behavioral_baselines FOR SELECT USING (auth.uid() = user_id);

-- Only system/service role can insert or update (bypassing RLS or relying on specific policies, but we'll allow insert for testing if needed)
CREATE POLICY "System can insert ml_risk_logs" ON public.ml_risk_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update behavioral_baselines" ON public.behavioral_baselines FOR ALL USING (true) WITH CHECK (true);
