-- SecureAuth AI Engine schema definitions for Supabase
-- Create these tables in your Supabase project to support AI risk telemetry and model persistence.

CREATE TABLE IF NOT EXISTS public.ai_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  risk_level text NOT NULL,
  factors jsonb,
  ip_address text,
  device_id text,
  location jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.threat_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  compromise_probability numeric(5,2) NOT NULL,
  vulnerability_class text NOT NULL,
  contributing_factors jsonb,
  recommendations jsonb,
  predicted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anomaly_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL,
  details jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavioral_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  typing_baseline jsonb,
  mouse_baseline jsonb,
  login_patterns jsonb,
  trust_score numeric(5,2) NOT NULL DEFAULT 100.0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  inputs jsonb,
  outputs jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
