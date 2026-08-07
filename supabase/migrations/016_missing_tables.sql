-- Migration 016: Missing Operational Tables
-- Tables referenced by application code / API routes that were never part of
-- any migration, plus ALTER TABLE patches so pre-existing hosted tables gain
-- the exact columns the application expects. Idempotent.

-- ==========================================
-- 1. Organizations (used as "offices")
-- ==========================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    industry TEXT,
    logo_url TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    region TEXT,
    zone TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Security Events
-- ==========================================

CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    details JSONB,
    ip_address TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. Threat Logs
-- ==========================================

CREATE TABLE IF NOT EXISTS public.threat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    threat_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    details JSONB,
    source_ip TEXT,
    status VARCHAR(50) DEFAULT 'open',
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. Office Access Logs
-- ==========================================

CREATE TABLE IF NOT EXISTS public.office_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL DEFAULT 'ENTRY',
    location VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. AI Engine telemetry (ai-engine/schema.sql)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    factors JSONB,
    ip_address TEXT,
    device_id TEXT,
    location JSONB,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.threat_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    compromise_probability NUMERIC(5,2) NOT NULL,
    vulnerability_class TEXT NOT NULL,
    contributing_factors JSONB,
    recommendations JSONB,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anomaly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    details JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavioral_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    typing_baseline JSONB,
    mouse_baseline JSONB,
    login_patterns JSONB,
    trust_score NUMERIC(5,2) NOT NULL DEFAULT 100.0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    inputs JSONB,
    outputs JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 6. ALTER patches for pre-existing tables
--    (ensure hosted tables created by older
--    schema.sql / manual DDL get the columns
--    the application actually uses)
-- ==========================================

-- users: columns only present in database/schema.sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'EMPLOYEE';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS risk_score NUMERIC DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- login_logs: risk/metadata columns used by login, mfa, analytics, travel-check
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS location JSONB;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS risk_score NUMERIC;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE;

-- audit_logs: merge shape of migration 008 and schema.sql
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource VARCHAR(100);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(255);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changes JSONB;

-- notifications: ensure both schema.sql and 007_employee_self_service shapes
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- devices: ensure both schema.sql and 005_hardware_persistence shapes
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_id VARCHAR(255) UNIQUE;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(100);
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS push_token TEXT;

-- attendance: location columns used by employee attendance route
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS location_in TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS location_out TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'present';
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS lon NUMERIC;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS location_valid BOOLEAN;

-- leaves / documents / approvals: application columns (migration 008 only added policies)
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS admin_remarks TEXT;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS data_payload JSONB;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- 7. RLS policies for the new operational tables
-- ==========================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON public.organizations;
CREATE POLICY "Authenticated users can view organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view security events" ON public.security_events;
CREATE POLICY "Authenticated users can view security events" ON public.security_events
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
CREATE POLICY "Admins can manage security events" ON public.security_events
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.threat_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view threat logs" ON public.threat_logs;
CREATE POLICY "Authenticated users can view threat logs" ON public.threat_logs
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage threat logs" ON public.threat_logs;
CREATE POLICY "Admins can manage threat logs" ON public.threat_logs
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.office_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view office access logs" ON public.office_access_logs;
CREATE POLICY "Authenticated users can view office access logs" ON public.office_access_logs
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage office access logs" ON public.office_access_logs;
CREATE POLICY "Admins can manage office access logs" ON public.office_access_logs
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.ai_risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ai risk scores" ON public.ai_risk_scores;
CREATE POLICY "Users can view own ai risk scores" ON public.ai_risk_scores FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all ai risk scores" ON public.ai_risk_scores;
CREATE POLICY "Admins can view all ai risk scores" ON public.ai_risk_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);
DROP POLICY IF EXISTS "System can insert ai risk scores" ON public.ai_risk_scores;
CREATE POLICY "System can insert ai risk scores" ON public.ai_risk_scores FOR INSERT WITH CHECK (true);

ALTER TABLE public.threat_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view threat predictions" ON public.threat_predictions;
CREATE POLICY "Admins can view threat predictions" ON public.threat_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);
DROP POLICY IF EXISTS "System can insert threat predictions" ON public.threat_predictions;
CREATE POLICY "System can insert threat predictions" ON public.threat_predictions FOR INSERT WITH CHECK (true);

ALTER TABLE public.anomaly_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own anomaly logs" ON public.anomaly_logs;
CREATE POLICY "Users can view own anomaly logs" ON public.anomaly_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all anomaly logs" ON public.anomaly_logs;
CREATE POLICY "Admins can view all anomaly logs" ON public.anomaly_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

ALTER TABLE public.behavioral_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own behavioral profile" ON public.behavioral_profiles;
CREATE POLICY "Users can view own behavioral profile" ON public.behavioral_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view behavioral profiles" ON public.behavioral_profiles;
CREATE POLICY "Admins can view behavioral profiles" ON public.behavioral_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view ml predictions" ON public.ml_predictions;
CREATE POLICY "Admins can view ml predictions" ON public.ml_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);
DROP POLICY IF EXISTS "System can insert ml predictions" ON public.ml_predictions;
CREATE POLICY "System can insert ml predictions" ON public.ml_predictions FOR INSERT WITH CHECK (true);
