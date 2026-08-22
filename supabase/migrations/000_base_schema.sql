-- Migration 000: Base Schema
-- Foundational tables required by every subsequent migration (HRMS, auth, risk
-- scoring, auth) and referenced directly by application code.
-- Idempotent: safe on both fresh databases and existing hosted projects.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Roles & Permissions
-- ==========================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ==========================================
-- 2. Users (profile extending auth.users)
--    Merged shape: supabase/schema.sql + database/schema.sql + all ALTER
--    columns added by migrations 001/003/010 so those ALTERs become no-ops.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'employee',
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    department VARCHAR(255),
    designation VARCHAR(100),
    employee_id VARCHAR(50) UNIQUE,
    org_id UUID,
    status VARCHAR(20) DEFAULT 'active',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    is_mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    push_token TEXT,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    failed_login_attempts INT DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    date_of_joining DATE,
    gender VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    emergency_contact VARCHAR(20),
    employment_type VARCHAR(50) DEFAULT 'Full-time',
    blood_group VARCHAR(10),
    manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    salary NUMERIC,
    risk_score NUMERIC DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    face_embedding JSONB,
    allowed_lat NUMERIC,
    allowed_lon NUMERIC,
    allowed_radius INTEGER DEFAULT 100,
    last_login TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. Departments
-- ==========================================

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    head UUID REFERENCES public.users(id) ON DELETE SET NULL,
    employee_count INTEGER DEFAULT 0,
    avg_risk_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. Devices
-- ==========================================

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE,
    device_name VARCHAR(100),
    device_type VARCHAR(100),
    os VARCHAR(100),
    browser VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    push_token TEXT,
    is_trusted BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. Sessions
-- ==========================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. Geo Locations
-- ==========================================

CREATE TABLE IF NOT EXISTS public.geo_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    ip_address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    latitude NUMERIC,
    longitude NUMERIC,
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 7. Device Fingerprint
-- ==========================================

CREATE TABLE IF NOT EXISTS public.device_fingerprint (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    fingerprint_hash TEXT UNIQUE NOT NULL,
    canvas_hash TEXT,
    webgl_hash TEXT,
    hardware_concurrency INT,
    device_memory INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 8. Typing Behavior
-- ==========================================

CREATE TABLE IF NOT EXISTS public.typing_behavior (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    flight_time_avg NUMERIC,
    dwell_time_avg NUMERIC,
    error_rate NUMERIC,
    profile_confidence_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 9. Risk Scores
-- ==========================================

CREATE TABLE IF NOT EXISTS public.risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    risk_level VARCHAR(20),
    factors JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 10. Login History
-- ==========================================

CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    ip_address TEXT,
    browser TEXT,
    os TEXT,
    status VARCHAR(50),
    failure_reason TEXT,
    risk_score NUMERIC,
    risk_level VARCHAR(20),
    latitude NUMERIC,
    longitude NUMERIC,
    city VARCHAR(100),
    country VARCHAR(100),
    risk_score_id UUID REFERENCES public.risk_scores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 11. Alerts
-- ==========================================

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 12. Audit Logs
--    Merged shape: migration 008 + schema.sql (application inserts
--    user_id, action, resource, details, ip_address).
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(100),
    details JSONB,
    ip_address TEXT,
    entity_type VARCHAR(255),
    entity_id UUID,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 13. OAuth Accounts
-- ==========================================

CREATE TABLE IF NOT EXISTS public.oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- ==========================================
-- 14. WebAuthn User Credentials
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    transports JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 15. Admins / Employee Requests / Support
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    org_id UUID,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 17. Login Logs
--    Merged shape used across the app: metadata->lat/lon, is_remote,
--    risk_level, failure_reason, location, etc.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    browser TEXT,
    os TEXT,
    user_agent TEXT,
    location JSONB,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    risk_level VARCHAR(20),
    risk_score NUMERIC,
    failure_reason TEXT,
    is_remote BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 18. Attendance / Leaves / Documents / Approvals
--    Created here (before 008/010 which ALTER and add RLS on them).
-- ==========================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    location_in TEXT,
    location_out TEXT,
    status VARCHAR(50) DEFAULT 'present',
    verification_status VARCHAR(50) DEFAULT 'PENDING',
    lat NUMERIC,
    lon NUMERIC,
    device_info JSONB,
    location_valid BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    admin_remarks TEXT,
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type VARCHAR(50),
    document_name VARCHAR(255),
    name VARCHAR(255),
    file_url TEXT,
    url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    data_payload JSONB,
    status VARCHAR(50) DEFAULT 'PENDING',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- Signup trigger: auto-create profile on auth.users insert
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- ROW LEVEL SECURITY (policies NOT already
-- created by later migrations 001-013)
-- ==========================================

-- Users: self-service policies (migration 006 adds the admin-wide read)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can delete own sessions"
    ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Login History
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
CREATE POLICY "Users can view own login history" ON public.login_history FOR SELECT USING (auth.uid() = user_id);

-- Risk Scores
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own risk scores" ON public.risk_scores;
CREATE POLICY "Users can view own risk scores" ON public.risk_scores FOR SELECT USING (auth.uid() = user_id);

-- Alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

-- Geo Locations
ALTER TABLE public.geo_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own geo locations" ON public.geo_locations;
CREATE POLICY "Users can view own geo locations" ON public.geo_locations FOR SELECT USING (auth.uid() = user_id);

-- Device Fingerprint
ALTER TABLE public.device_fingerprint ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own device fingerprints" ON public.device_fingerprint;
CREATE POLICY "Users can view own device fingerprints" ON public.device_fingerprint FOR SELECT USING (auth.uid() = user_id);

-- Typing Behavior
ALTER TABLE public.typing_behavior ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own typing behavior" ON public.typing_behavior;
CREATE POLICY "Users can view own typing behavior" ON public.typing_behavior FOR SELECT USING (auth.uid() = user_id);

-- OAuth Accounts
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own oauth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can view own oauth accounts" ON public.oauth_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own oauth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can manage own oauth accounts" ON public.oauth_accounts FOR ALL USING (auth.uid() = user_id);

-- WebAuthn User Credentials
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own credentials" ON public.user_credentials;
CREATE POLICY "Users can view own credentials"
    ON public.user_credentials FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own credentials" ON public.user_credentials;
CREATE POLICY "Users can manage own credentials"
    ON public.user_credentials FOR ALL
    USING (auth.uid() = user_id);

-- Admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (true);

-- Employee Requests
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own requests" ON public.employee_requests;
CREATE POLICY "Users can view own requests" ON public.employee_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own requests" ON public.employee_requests;
CREATE POLICY "Users can insert own requests" ON public.employee_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Login Logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own logs" ON public.login_logs;
CREATE POLICY "Users can view own logs" ON public.login_logs FOR SELECT USING (auth.uid() = user_id);

-- Support Queries
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own support queries" ON public.support_queries;
CREATE POLICY "Users can view own support queries" ON public.support_queries FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert support queries" ON public.support_queries;
CREATE POLICY "Users can insert support queries" ON public.support_queries FOR INSERT WITH CHECK (true);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by admins" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by admins" ON public.audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin')));
DROP POLICY IF EXISTS "Audit logs insertable by triggers" ON public.audit_logs;
CREATE POLICY "Audit logs insertable by triggers" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
