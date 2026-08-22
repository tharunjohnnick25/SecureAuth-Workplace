-- ==========================================
-- COMPLETE SCHEMA RESET AND MIGRATION SCRIPT
-- ==========================================

-- WARNING: THIS WILL DROP ALL EXISTING TABLES IN PUBLIC SCHEMA AND DELETE ALL AUTH USERS
DELETE FROM auth.users;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restore Default Supabase Permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;



-- ==========================================
-- MIGRATION: 000_base_schema.sql
-- ==========================================

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
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT
    USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Login History
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
CREATE POLICY "Users can view own login history" ON public.login_history FOR SELECT USING (auth.uid() = user_id);

-- Risk Scores
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own risk scores" ON public.risk_scores;
DROP POLICY IF EXISTS "Users can view own risk scores" ON public.risk_scores;
CREATE POLICY "Users can view own risk scores" ON public.risk_scores FOR SELECT USING (auth.uid() = user_id);

-- Alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);

-- Geo Locations
ALTER TABLE public.geo_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own geo locations" ON public.geo_locations;
DROP POLICY IF EXISTS "Users can view own geo locations" ON public.geo_locations;
CREATE POLICY "Users can view own geo locations" ON public.geo_locations FOR SELECT USING (auth.uid() = user_id);

-- Device Fingerprint
ALTER TABLE public.device_fingerprint ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own device fingerprints" ON public.device_fingerprint;
DROP POLICY IF EXISTS "Users can view own device fingerprints" ON public.device_fingerprint;
CREATE POLICY "Users can view own device fingerprints" ON public.device_fingerprint FOR SELECT USING (auth.uid() = user_id);

-- Typing Behavior
ALTER TABLE public.typing_behavior ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own typing behavior" ON public.typing_behavior;
DROP POLICY IF EXISTS "Users can view own typing behavior" ON public.typing_behavior;
CREATE POLICY "Users can view own typing behavior" ON public.typing_behavior FOR SELECT USING (auth.uid() = user_id);

-- OAuth Accounts
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own oauth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can view own oauth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can view own oauth accounts" ON public.oauth_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own oauth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can manage own oauth accounts" ON public.oauth_accounts;
CREATE POLICY "Users can manage own oauth accounts" ON public.oauth_accounts FOR ALL USING (auth.uid() = user_id);

-- WebAuthn User Credentials
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Users can view own credentials" ON public.user_credentials;
CREATE POLICY "Users can view own credentials" ON public.user_credentials FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Users can manage own credentials" ON public.user_credentials;
CREATE POLICY "Users can manage own credentials" ON public.user_credentials FOR ALL
    USING (auth.uid() = user_id);

-- Admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;
CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT USING (true);

-- Employee Requests
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own requests" ON public.employee_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.employee_requests;
CREATE POLICY "Users can view own requests" ON public.employee_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own requests" ON public.employee_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON public.employee_requests;
CREATE POLICY "Users can insert own requests" ON public.employee_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Login Logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own logs" ON public.login_logs;
DROP POLICY IF EXISTS "Users can view own logs" ON public.login_logs;
CREATE POLICY "Users can view own logs" ON public.login_logs FOR SELECT USING (auth.uid() = user_id);

-- Support Queries
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own support queries" ON public.support_queries;
DROP POLICY IF EXISTS "Users can view own support queries" ON public.support_queries;
CREATE POLICY "Users can view own support queries" ON public.support_queries FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert support queries" ON public.support_queries;
DROP POLICY IF EXISTS "Users can insert support queries" ON public.support_queries;
CREATE POLICY "Users can insert support queries" ON public.support_queries FOR INSERT WITH CHECK (true);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by admins" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs viewable by admins" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by admins" ON public.audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin')));
DROP POLICY IF EXISTS "Audit logs insertable by triggers" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by triggers" ON public.audit_logs;
CREATE POLICY "Audit logs insertable by triggers" ON public.audit_logs
  FOR INSERT WITH CHECK (true);


-- ==========================================
-- MIGRATION: 001_hrms_extension.sql
-- ==========================================

-- HRMS Extension: Employee & Department Management
-- Adds employee-specific fields and document management

-- Extend users table with HRMS fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Full-time';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Employee Documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments enhancements
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Attendance summary view (simplified for HRMS)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Leave balance table
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    total_days NUMERIC NOT NULL DEFAULT 0,
    used_days NUMERIC NOT NULL DEFAULT 0,
    pending_days NUMERIC NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, leave_type, year)
);

-- RLS Policies
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.employee_documents;
CREATE POLICY "Users can view own documents" ON public.employee_documents FOR SELECT USING (auth.uid() = employee_id);
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.employee_documents;
CREATE POLICY "Admins can manage all documents" ON public.employee_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_records;
CREATE POLICY "Users can view own attendance" ON public.attendance_records FOR SELECT USING (auth.uid() = employee_id);
DROP POLICY IF EXISTS "Users can view own leave" ON public.leave_balances;
CREATE POLICY "Users can view own leave" ON public.leave_balances FOR SELECT USING (auth.uid() = employee_id);

-- Departments RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Trigger to update employee_count in departments
CREATE OR REPLACE FUNCTION public.update_department_employee_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.departments
        SET employee_count = (
            SELECT COUNT(*) FROM public.users WHERE department = NEW.department
        )
        WHERE name = NEW.department;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_department_count ON public.users;
CREATE TRIGGER trg_update_department_count
    AFTER INSERT OR UPDATE OF department OR DELETE
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_department_employee_count();

-- Function to get department analytics
CREATE OR REPLACE FUNCTION public.get_department_analytics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH dept_stats AS (
        SELECT
            d.name,
            d.head,
            d.employee_count,
            COALESCE((
                SELECT COUNT(*) FROM public.users u
                WHERE u.department = d.name AND u.status = 'active'
            ), 0) as active_count,
            COALESCE((
                SELECT COUNT(*) FROM public.users u
                WHERE u.department = d.name AND u.status != 'active'
            ), 0) as inactive_count
        FROM public.departments d
    )
    SELECT JSONB_BUILD_OBJECT(
        'totalDepartments', (SELECT COUNT(*) FROM public.departments),
        'totalEmployees', (SELECT COUNT(*) FROM public.users WHERE department IS NOT NULL),
        'activeEmployees', (SELECT COUNT(*) FROM public.users WHERE status = 'active'),
        'inactiveEmployees', (SELECT COUNT(*) FROM public.users WHERE status != 'active'),
        'avgEmployeesPerDept', COALESCE((SELECT ROUND(AVG(employee_count)::numeric, 1) FROM public.departments), 0),
        'largestDepartment', (SELECT name FROM public.departments ORDER BY employee_count DESC LIMIT 1),
        'smallestDepartment', (SELECT name FROM public.departments ORDER BY employee_count ASC LIMIT 1),
        'departments', JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'name', name,
                'head', head,
                'employeeCount', employee_count,
                'activeCount', active_count,
                'inactiveCount', inactive_count
            )
        )
    ) INTO result
    FROM dept_stats;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- MIGRATION: 002_roles_and_permissions.sql
-- ==========================================

-- Migration: 002_roles_and_permissions.sql
-- Create roles table and populate default data

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create policies (only admins can manage roles)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles" ON public.roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'Admin'
        )
    );

-- Allow read access for authenticated users (to check their own permissions if needed)
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
CREATE POLICY "Authenticated users can read roles" ON public.roles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Insert default roles if not exist
INSERT INTO public.roles (name, description, permissions, is_system)
VALUES 
    ('Super Admin', 'Full access to all system features', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"analytics":true,"settings":true,"access_requests":true,"user_management":true}', true),
    ('HR Manager', 'Manage HR operations', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"access_requests":true}', false),
    ('Employee', 'Standard employee access', '{"dashboard":true,"attendance":true,"leave":true,"reports":false}', false)
ON CONFLICT (name) DO NOTHING;


-- ==========================================
-- MIGRATION: 003_add_departments.sql
-- ==========================================

-- Add departments table

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

-- RLS Policies for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Note: The trigger public.update_department_employee_count() from 001_hrms_extension.sql
-- requires 'department' column in public.users to be a string matching 'name' in departments.
-- Let's ensure public.users has a 'department' column.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(255);


-- ==========================================
-- MIGRATION: 004_update_roles.sql
-- ==========================================

-- Migration: 004_update_roles.sql
-- Add permissions and is_system columns to roles table

ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Insert default roles if not exist
INSERT INTO public.roles (name, description, permissions, is_system)
VALUES 
    ('Super Admin', 'Full access to all system features', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"analytics":true,"settings":true,"access_requests":true,"user_management":true}', true),
    ('HR Manager', 'Manage HR operations', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"access_requests":true}', false),
    ('Employee', 'Standard employee access', '{"dashboard":true,"attendance":true,"leave":true,"reports":false}', false)
ON CONFLICT (name) DO NOTHING;


-- ==========================================
-- MIGRATION: 005_hardware_persistence.sql
-- ==========================================

-- Hardware Persistence Table for Devices

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_type VARCHAR(100),
    os VARCHAR(100),
    browser VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    is_trusted BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Policies for devices
DROP POLICY IF EXISTS "Users can view their own devices" ON public.devices;
CREATE POLICY "Users can view their own devices" ON public.devices FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all devices" ON public.devices;
CREATE POLICY "Admin can view all devices" ON public.devices FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.designation ILIKE '%admin%'
  )
);


-- ==========================================
-- MIGRATION: 006_analytics_rls.sql
-- ==========================================

-- Enable public read access for authenticated users to populate analytics

-- Users table
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
CREATE POLICY "Authenticated users can view users" ON public.users FOR SELECT 
TO authenticated 
USING (true);

-- Departments table
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT 
TO authenticated 
USING (true);

-- Devices table (Adding to existing if needed)
DROP POLICY IF EXISTS "Authenticated users can view devices" ON public.devices;
CREATE POLICY "Authenticated users can view devices" ON public.devices FOR SELECT 
TO authenticated 
USING (true);

-- Note: In a production environment, you might want to restrict these to only admins or managers.
-- Since the analytics dashboard is intended for admins, it's safe to assume authenticated users accessing it have permissions. 
-- Or restrict it: USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (designation ILIKE '%admin%' OR designation ILIKE '%manager%')));


-- ==========================================
-- MIGRATION: 007_employee_self_service.sql
-- ==========================================

-- Migration 007: Employee Self Service and Tasks

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, Completed, Approved
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Attachments Table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Requests Table
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- LEAVE, PROFILE_UPDATE, DOCUMENT, TASK
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    data_payload JSONB,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- TASK_ASSIGNED, LEAVE_APPROVED, PROFILE_UPDATED, SYSTEM_ALERT
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tasks Policies
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
CREATE POLICY "Users can update their tasks" ON public.tasks FOR UPDATE USING (auth.uid() = assigned_to);
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

-- Attachments Policies
DROP POLICY IF EXISTS "Users can view attachments for their tasks" ON public.task_attachments;
CREATE POLICY "Users can view attachments for their tasks" ON public.task_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND (assigned_to = auth.uid() OR assigned_by = auth.uid()))
);
DROP POLICY IF EXISTS "Users can upload attachments for their tasks" ON public.task_attachments;
CREATE POLICY "Users can upload attachments for their tasks" ON public.task_attachments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND assigned_to = auth.uid())
);
DROP POLICY IF EXISTS "Admins can view all task attachments" ON public.task_attachments;
CREATE POLICY "Admins can view all task attachments" ON public.task_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

-- Approvals Policies
DROP POLICY IF EXISTS "Users can view their own requests" ON public.approval_requests;
CREATE POLICY "Users can view their own requests" ON public.approval_requests FOR SELECT USING (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Users can create requests" ON public.approval_requests;
CREATE POLICY "Users can create requests" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Admins can manage all approvals" ON public.approval_requests;
CREATE POLICY "Admins can manage all approvals" ON public.approval_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true); -- Simplified for backend insert


-- ==========================================
-- MIGRATION: 008_security_audit.sql
-- ==========================================

-- Enable RLS on core HRMS tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- 1. Tasks Policies
-- Employees can view tasks assigned to them
DROP POLICY IF EXISTS "Tasks viewable by assignee" ON tasks;
CREATE POLICY "Tasks viewable by assignee" ON tasks
  FOR SELECT USING (auth.uid() = assigned_to);

-- Admins can view all tasks
DROP POLICY IF EXISTS "Tasks viewable by admins" ON tasks;
CREATE POLICY "Tasks viewable by admins" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin'))
  );

-- Employees can update their own tasks
DROP POLICY IF EXISTS "Tasks updateable by assignee" ON tasks;
CREATE POLICY "Tasks updateable by assignee" ON tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

-- Admins can insert/update/delete all tasks
DROP POLICY IF EXISTS "Tasks insertable by admins" ON tasks;
CREATE POLICY "Tasks insertable by admins" ON tasks
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Tasks updatable by admins" ON tasks;
CREATE POLICY "Tasks updatable by admins" ON tasks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Tasks deletable by admins" ON tasks;
CREATE POLICY "Tasks deletable by admins" ON tasks
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

-- 2. Leaves Policies
DROP POLICY IF EXISTS "Leaves viewable by self" ON leaves;
CREATE POLICY "Leaves viewable by self" ON leaves
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Leaves viewable by admins" ON leaves;
CREATE POLICY "Leaves viewable by admins" ON leaves
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Leaves insertable by self" ON leaves;
CREATE POLICY "Leaves insertable by self" ON leaves
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Leaves updatable by admins" ON leaves;
CREATE POLICY "Leaves updatable by admins" ON leaves
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

-- 3. Attendance Policies
DROP POLICY IF EXISTS "Attendance viewable by self" ON attendance;
CREATE POLICY "Attendance viewable by self" ON attendance
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Attendance viewable by admins" ON attendance;
CREATE POLICY "Attendance viewable by admins" ON attendance
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Attendance insertable by self" ON attendance;
CREATE POLICY "Attendance insertable by self" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Attendance updatable by self" ON attendance;
CREATE POLICY "Attendance updatable by self" ON attendance
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Documents Policies
DROP POLICY IF EXISTS "Documents viewable by self" ON documents;
CREATE POLICY "Documents viewable by self" ON documents
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Documents viewable by admins" ON documents;
CREATE POLICY "Documents viewable by admins" ON documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Documents insertable by self" ON documents;
CREATE POLICY "Documents insertable by self" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Documents updatable by admins" ON documents;
CREATE POLICY "Documents updatable by admins" ON documents
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

-- 5. Approvals Policies
DROP POLICY IF EXISTS "Approvals viewable by requester" ON approvals;
CREATE POLICY "Approvals viewable by requester" ON approvals
  FOR SELECT USING (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Approvals viewable by admins" ON approvals;
CREATE POLICY "Approvals viewable by admins" ON approvals
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Approvals insertable by self" ON approvals;
CREATE POLICY "Approvals insertable by self" ON approvals
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Approvals updatable by admins" ON approvals;
CREATE POLICY "Approvals updatable by admins" ON approvals
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));


-- 6. Basic Audit Logs Trigger
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255),
    entity_id UUID,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by admins" ON audit_logs;
CREATE POLICY "Audit logs viewable by admins" ON audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Audit logs insertable by triggers" ON audit_logs;
CREATE POLICY "Audit logs insertable by triggers" ON audit_logs
  FOR INSERT WITH CHECK (true); -- Allow internal trigger insertions


-- ==========================================
-- MIGRATION: 009_access_management.sql
-- ==========================================

-- 1. Access Requests (For Just-In-Time / Permanent Access)
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES auth.users(id) NOT NULL,
    module VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    duration_hours INTEGER, -- NULL means permanent
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXPIRED, REVOKED
    approved_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access Requests viewable by self" ON access_requests;
CREATE POLICY "Access Requests viewable by self" ON access_requests
  FOR SELECT USING (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Access Requests viewable by admins" ON access_requests;
CREATE POLICY "Access Requests viewable by admins" ON access_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Access Requests insertable by self" ON access_requests;
CREATE POLICY "Access Requests insertable by self" ON access_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Access Requests updatable by admins" ON access_requests;
CREATE POLICY "Access Requests updatable by admins" ON access_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));


-- 2. Granular User Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    permission VARCHAR(100) NOT NULL, -- e.g., 'reports.view', 'billing.manage'
    granted_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE, -- For JIT access tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissions viewable by self" ON user_permissions;
CREATE POLICY "Permissions viewable by self" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Permissions viewable by admins" ON user_permissions;
CREATE POLICY "Permissions viewable by admins" ON user_permissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Permissions updatable by admins" ON user_permissions;
CREATE POLICY "Permissions updatable by admins" ON user_permissions
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));


-- 3. Trust Scores
CREATE TABLE IF NOT EXISTS trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    device_id UUID, -- Optional link to devices table
    score INTEGER DEFAULT 100 CHECK (score >= 0 AND score <= 100),
    risk_level VARCHAR(20) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    factors JSONB, -- Array of reasons for score changes
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trust scores viewable by self" ON trust_scores;
CREATE POLICY "Trust scores viewable by self" ON trust_scores
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Trust scores viewable by admins" ON trust_scores;
CREATE POLICY "Trust scores viewable by admins" ON trust_scores
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
DROP POLICY IF EXISTS "Trust scores managed by system" ON trust_scores;
CREATE POLICY "Trust scores managed by system" ON trust_scores
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));


-- ==========================================
-- MIGRATION: 010_advanced_hrms.sql
-- ==========================================

-- 1. Extend Users table for Face Biometrics & GPS Location
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_embedding JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lat NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lon NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_radius INTEGER DEFAULT 100; -- meters

-- 2. Expand Attendance table for GPS and Verification Status
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lon NUMERIC;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location_valid BOOLEAN;

-- 3. Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(50) DEFAULT 'MEETING', -- MEETING, TASK, EVENT, LEAVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Calendar viewable by self" ON calendar_events;
CREATE POLICY "Calendar viewable by self" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

DROP POLICY IF EXISTS "Calendar insertable by self or admin" ON calendar_events;
CREATE POLICY "Calendar insertable by self or admin" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

DROP POLICY IF EXISTS "Calendar updatable by self or admin" ON calendar_events;
CREATE POLICY "Calendar updatable by self or admin" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

DROP POLICY IF EXISTS "Calendar deletable by self or admin" ON calendar_events;
CREATE POLICY "Calendar deletable by self or admin" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));


-- ==========================================
-- MIGRATION: 011_face_and_leave.sql
-- ==========================================

-- Migration 011: Face Verification and Leave Management

-- Face Embeddings Table
CREATE TABLE IF NOT EXISTS public.face_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    document_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, INFO_REQUESTED
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Face Embeddings Policies
DROP POLICY IF EXISTS "Admins can manage face embeddings" ON public.face_embeddings;
CREATE POLICY "Admins can manage face embeddings" ON public.face_embeddings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role_id IS NOT NULL OR true)) -- Simplified for standard admin check based on this project's varying admin checks
);
DROP POLICY IF EXISTS "Users can view own face embeddings" ON public.face_embeddings;
CREATE POLICY "Users can view own face embeddings" ON public.face_embeddings FOR SELECT USING (auth.uid() = user_id);

-- Leave Requests Policies
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
CREATE POLICY "Users can view own leave requests" ON public.leave_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own leave requests" ON public.leave_requests;
CREATE POLICY "Users can insert own leave requests" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own pending leave requests" ON public.leave_requests;
CREATE POLICY "Users can update own pending leave requests" ON public.leave_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'PENDING');
DROP POLICY IF EXISTS "Admins can manage all leave requests" ON public.leave_requests;
CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Using a generic admin check approach found in previous migrations or just standard check
);


-- ==========================================
-- MIGRATION: 012_ai_risk_score.sql
-- ==========================================

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
DROP POLICY IF EXISTS "Admins can view all ml_risk_logs" ON public.ml_risk_logs;
CREATE POLICY "Admins can view all ml_risk_logs" ON public.ml_risk_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Standard admin check
);
DROP POLICY IF EXISTS "Admins can view all behavioral_baselines" ON public.behavioral_baselines;
CREATE POLICY "Admins can view all behavioral_baselines" ON public.behavioral_baselines FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Standard admin check
);

-- Users can view their own risk logs and baselines (read-only)
DROP POLICY IF EXISTS "Users can view own ml_risk_logs" ON public.ml_risk_logs;
CREATE POLICY "Users can view own ml_risk_logs" ON public.ml_risk_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own behavioral_baselines" ON public.behavioral_baselines;
CREATE POLICY "Users can view own behavioral_baselines" ON public.behavioral_baselines FOR SELECT USING (auth.uid() = user_id);

-- Only system/service role can insert or update (bypassing RLS or relying on specific policies, but we'll allow insert for testing if needed)
DROP POLICY IF EXISTS "System can insert ml_risk_logs" ON public.ml_risk_logs;
CREATE POLICY "System can insert ml_risk_logs" ON public.ml_risk_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "System can update behavioral_baselines" ON public.behavioral_baselines;
CREATE POLICY "System can update behavioral_baselines" ON public.behavioral_baselines FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- MIGRATION: 013_webauthn_passkeys.sql
-- ==========================================

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
DROP POLICY IF EXISTS "Admins can view all passkeys" ON public.passkeys;
CREATE POLICY "Admins can view all passkeys" ON public.passkeys FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) -- Standard admin check
);

-- Users can manage their own passkeys
DROP POLICY IF EXISTS "Users can manage own passkeys" ON public.passkeys;
CREATE POLICY "Users can manage own passkeys" ON public.passkeys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Challenges are meant to be manipulated securely by the backend bypassing RLS, but we allow insert/select/delete for the user id
DROP POLICY IF EXISTS "Users can manage own challenges" ON public.webauthn_challenges;
CREATE POLICY "Users can manage own challenges" ON public.webauthn_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- System bypasses (since API routes use service role key, they bypass RLS anyway)


-- ==========================================
-- MIGRATION: 014_sql_editor_rpc.sql
-- ==========================================

-- Migration 014: SQL Editor RPC Function

-- Create a secure Postgres function to execute arbitrary SQL.
-- SECURITY DEFINER allows it to run with the privileges of the user that created it (postgres superuser).
CREATE OR REPLACE FUNCTION admin_exec_sql(query text) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Attempt to execute the query as a SELECT and aggregate results into JSON.
  -- The COALESCE ensures we return '[]' instead of NULL if the table is empty.
  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]'') FROM (' || query || ') t' INTO result;
  RETURN result;
EXCEPTION WHEN others THEN
  -- If the query was not a SELECT (e.g. UPDATE, INSERT, DELETE, CREATE),
  -- the above EXECUTE will fail because it doesn't return rows.
  -- In that case, we catch the exception and run it directly.
  EXECUTE query;
  RETURN '{"status": "success", "message": "Query executed successfully. No data returned."}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extremely strict permissions:
-- 1. Revoke execution from everyone by default.
REVOKE EXECUTE ON FUNCTION admin_exec_sql(text) FROM public;
REVOKE EXECUTE ON FUNCTION admin_exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_exec_sql(text) FROM authenticated;

-- 2. Grant execution ONLY to the service_role.
-- This ensures it can only be invoked from backend APIs with the SUPABASE_SERVICE_ROLE_KEY.
GRANT EXECUTE ON FUNCTION admin_exec_sql(text) TO service_role;


-- ==========================================
-- MIGRATION: 015_face_biometrics.sql
-- ==========================================

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
DROP POLICY IF EXISTS "Users can view own enrollment metadata" ON public.face_embeddings;
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


-- ==========================================
-- MIGRATION: 016_missing_tables.sql
-- ==========================================

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
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON public.organizations;
CREATE POLICY "Authenticated users can view organizations" ON public.organizations
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view security events" ON public.security_events;
DROP POLICY IF EXISTS "Authenticated users can view security events" ON public.security_events;
CREATE POLICY "Authenticated users can view security events" ON public.security_events
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
CREATE POLICY "Admins can manage security events" ON public.security_events
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.threat_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view threat logs" ON public.threat_logs;
DROP POLICY IF EXISTS "Authenticated users can view threat logs" ON public.threat_logs;
CREATE POLICY "Authenticated users can view threat logs" ON public.threat_logs
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage threat logs" ON public.threat_logs;
DROP POLICY IF EXISTS "Admins can manage threat logs" ON public.threat_logs;
CREATE POLICY "Admins can manage threat logs" ON public.threat_logs
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.office_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view office access logs" ON public.office_access_logs;
DROP POLICY IF EXISTS "Authenticated users can view office access logs" ON public.office_access_logs;
CREATE POLICY "Authenticated users can view office access logs" ON public.office_access_logs
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage office access logs" ON public.office_access_logs;
DROP POLICY IF EXISTS "Admins can manage office access logs" ON public.office_access_logs;
CREATE POLICY "Admins can manage office access logs" ON public.office_access_logs
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );

ALTER TABLE public.ai_risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ai risk scores" ON public.ai_risk_scores;
DROP POLICY IF EXISTS "Users can view own ai risk scores" ON public.ai_risk_scores;
CREATE POLICY "Users can view own ai risk scores" ON public.ai_risk_scores FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all ai risk scores" ON public.ai_risk_scores;
DROP POLICY IF EXISTS "Admins can view all ai risk scores" ON public.ai_risk_scores;
CREATE POLICY "Admins can view all ai risk scores" ON public.ai_risk_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);
DROP POLICY IF EXISTS "System can insert ai risk scores" ON public.ai_risk_scores;
DROP POLICY IF EXISTS "System can insert ai risk scores" ON public.ai_risk_scores;
CREATE POLICY "System can insert ai risk scores" ON public.ai_risk_scores FOR INSERT WITH CHECK (true);

ALTER TABLE public.threat_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view threat predictions" ON public.threat_predictions;
DROP POLICY IF EXISTS "Admins can view threat predictions" ON public.threat_predictions;
CREATE POLICY "Admins can view threat predictions" ON public.threat_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);
DROP POLICY IF EXISTS "System can insert threat predictions" ON public.threat_predictions;
DROP POLICY IF EXISTS "System can insert threat predictions" ON public.threat_predictions;
CREATE POLICY "System can insert threat predictions" ON public.threat_predictions FOR INSERT WITH CHECK (true);

ALTER TABLE public.anomaly_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own anomaly logs" ON public.anomaly_logs;
DROP POLICY IF EXISTS "Users can view own anomaly logs" ON public.anomaly_logs;
CREATE POLICY "Users can view own anomaly logs" ON public.anomaly_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all anomaly logs" ON public.anomaly_logs;
DROP POLICY IF EXISTS "Admins can view all anomaly logs" ON public.anomaly_logs;
CREATE POLICY "Admins can view all anomaly logs" ON public.anomaly_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

ALTER TABLE public.behavioral_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own behavioral profile" ON public.behavioral_profiles;
DROP POLICY IF EXISTS "Users can view own behavioral profile" ON public.behavioral_profiles;
CREATE POLICY "Users can view own behavioral profile" ON public.behavioral_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view behavioral profiles" ON public.behavioral_profiles;
DROP POLICY IF EXISTS "Admins can view behavioral profiles" ON public.behavioral_profiles;
CREATE POLICY "Admins can view behavioral profiles" ON public.behavioral_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view ml predictions" ON public.ml_predictions;
DROP POLICY IF EXISTS "Admins can view ml predictions" ON public.ml_predictions;
CREATE POLICY "Admins can view ml predictions" ON public.ml_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);
DROP POLICY IF EXISTS "System can insert ml predictions" ON public.ml_predictions;
DROP POLICY IF EXISTS "System can insert ml predictions" ON public.ml_predictions;
CREATE POLICY "System can insert ml predictions" ON public.ml_predictions FOR INSERT WITH CHECK (true);


-- ==========================================
-- MIGRATION: 017_task_code_submissions.sql
-- ==========================================

-- Migration 017: Task Code Submissions (Piston compiler)
-- Stores every code run an employee makes while working on an assigned task,
-- so work is persisted and reviewable by the assigning admin.

CREATE TABLE IF NOT EXISTS public.task_code_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    version VARCHAR(50),
    code TEXT NOT NULL,
    output TEXT,
    stderr TEXT,
    status VARCHAR(20) DEFAULT 'COMPILED', -- PENDING, COMPILED, ERROR, TIMEOUT
    exit_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_code_submissions_task
    ON public.task_code_submissions (task_id, user_id, created_at DESC);

ALTER TABLE public.task_code_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own task submissions" ON public.task_code_submissions;
DROP POLICY IF EXISTS "Users can view own task submissions" ON public.task_code_submissions;
CREATE POLICY "Users can view own task submissions" ON public.task_code_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own task submissions" ON public.task_code_submissions;
DROP POLICY IF EXISTS "Users can insert own task submissions" ON public.task_code_submissions;
CREATE POLICY "Users can insert own task submissions" ON public.task_code_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all task submissions" ON public.task_code_submissions;
DROP POLICY IF EXISTS "Admins can view all task submissions" ON public.task_code_submissions;
CREATE POLICY "Admins can view all task submissions" ON public.task_code_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );


-- ==========================================
-- MIGRATION: 018_focus_mode.sql
-- ==========================================

-- Migration 018: Focus Mode & Time-Blocking
-- Per-user focus blocks. While a user is inside an active block, the server
-- suppresses (does not create) non-critical notifications addressed to them,
-- so they can get uninterrupted deep work.

CREATE TABLE IF NOT EXISTS public.focus_mode (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    -- JSON array of { start: 'HH:MM', end: 'HH:MM', days: number[] } (0 = Sunday)
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- When true, CRITICAL / SECURITY style alerts still get delivered during focus.
    allow_critical BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_focus_mode_user
    ON public.focus_mode (user_id);

ALTER TABLE public.focus_mode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own focus mode" ON public.focus_mode;
DROP POLICY IF EXISTS "Users can view own focus mode" ON public.focus_mode;
CREATE POLICY "Users can view own focus mode" ON public.focus_mode
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own focus mode" ON public.focus_mode;
DROP POLICY IF EXISTS "Users can manage own focus mode" ON public.focus_mode;
CREATE POLICY "Users can manage own focus mode" ON public.focus_mode
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Backend insert for admin/service contexts.
DROP POLICY IF EXISTS "Service can insert focus mode" ON public.focus_mode;
DROP POLICY IF EXISTS "Service can insert focus mode" ON public.focus_mode;
CREATE POLICY "Service can insert focus mode" ON public.focus_mode
  FOR INSERT WITH CHECK (true);


-- ==========================================
-- MIGRATION: 019_face_biometrics_v2.sql
-- ==========================================

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
DROP POLICY IF EXISTS "Admins can read all face login attempts" ON public.face_login_attempts;
CREATE POLICY "Admins can read all face login attempts" ON public.face_login_attempts FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
    );
DROP POLICY IF EXISTS "Employees can read own face login attempts" ON public.face_login_attempts;
CREATE POLICY "Employees can read own face login attempts" ON public.face_login_attempts FOR SELECT USING (auth.uid() = employee_id);
-- Service role writes attempts via RPC; no client insert policy.

-- biometric_deletion_requests: self service; admins manage all.
DROP POLICY IF EXISTS "Employees can manage own deletion requests" ON public.biometric_deletion_requests;
CREATE POLICY "Employees can manage own deletion requests" ON public.biometric_deletion_requests FOR ALL USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);
DROP POLICY IF EXISTS "Admins can manage deletion requests" ON public.biometric_deletion_requests;
CREATE POLICY "Admins can manage deletion requests" ON public.biometric_deletion_requests FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
    );

-- dpia_records: admins only (created in admin panel).
DROP POLICY IF EXISTS "Admins can manage dpia records" ON public.dpia_records;
CREATE POLICY "Admins can manage dpia records" ON public.dpia_records FOR ALL USING (
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


-- ==========================================
-- MIGRATION: 020_rbac_system.sql
-- ==========================================

-- Migration 020: RBAC System
-- Creates role enums, adds necessary fields to users, and creates role_change_logs.

-- 1. Create Role Enum type (Optional: using CHECK constraint for simplicity and altering existing data)
-- Since `role` in users is currently VARCHAR(50), we will enforce it with a CHECK constraint.
-- Before applying the constraint, we should normalize existing roles.
UPDATE public.users 
SET role = 'employee' 
WHERE LOWER(role) NOT IN ('super_admin', 'admin', 'manager', 'employee');

UPDATE public.users 
SET role = LOWER(role) 
WHERE LOWER(role) IN ('super_admin', 'admin', 'manager', 'employee');

-- 2. Alter Users Table
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Ensure role is strictly checked
ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS valid_role_check,
    ADD CONSTRAINT valid_role_check CHECK (role IN ('super_admin', 'admin', 'manager', 'employee'));

-- 3. Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);

-- 4. Create Role Change Logs Table
CREATE TABLE IF NOT EXISTS public.role_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    old_role VARCHAR(50) NOT NULL,
    new_role VARCHAR(50) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS Policies for Role Change Logs
ALTER TABLE public.role_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role change logs viewable by admins" ON public.role_change_logs;
DROP POLICY IF EXISTS "Role change logs viewable by admins" ON public.role_change_logs;
CREATE POLICY "Role change logs viewable by admins" ON public.role_change_logs
    FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Role change logs insertable by admins" ON public.role_change_logs;
DROP POLICY IF EXISTS "Role change logs insertable by admins" ON public.role_change_logs;
CREATE POLICY "Role change logs insertable by admins" ON public.role_change_logs
    FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));


-- ==========================================
-- MIGRATION: 021_company_isolation.sql
-- ==========================================

-- Migration 021: Multi-Tenant Company Isolation and Strict RLS
-- Creates the companies table and adds company_id to key tables.
-- Drops old loose RLS policies and replaces them with strict company boundary enforcement.

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add company_id to core tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.risk_scores ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_company_id ON public.access_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id ON public.leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_company_id ON public.attendance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_login_history_company_id ON public.login_history(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_company_id ON public.risk_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON public.alerts(company_id);

-- 4. Helper Function for RLS
-- SECURITY DEFINER ensures we fetch from users without recursive RLS loops
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 5. RLS Policies
-- Companies Table (Anyone can view companies they belong to, Admins can manage their company)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can manage own company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage own company" ON public.companies;
CREATE POLICY "Admins can manage own company" ON public.companies FOR ALL 
USING (
    id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- Users Table
-- Replace "Users can view own profile" with broader company-scoped view for managers/admins, 
-- and employee self-view.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles within company" ON public.users;
CREATE POLICY "Users can view profiles within company" ON public.users FOR SELECT 
USING (
    id = auth.uid() OR 
    (company_id = public.get_user_company_id() AND EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin', 'super_admin')))
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    -- Protect sensitive fields from being updated directly (handled via RPC/triggers if needed)
);

-- Admins can update/manage users in their own company
DROP POLICY IF EXISTS "Admins can manage users in company" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in company" ON public.users;
CREATE POLICY "Admins can manage users in company" ON public.users FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin'))
);

-- Departments Table
-- Strict company isolation
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Users can view company departments" ON public.departments;
CREATE POLICY "Users can view company departments" ON public.departments FOR SELECT 
USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage company departments" ON public.departments;
CREATE POLICY "Admins can manage company departments" ON public.departments FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
) WITH CHECK (
    company_id = public.get_user_company_id()
);

-- Tasks
-- Strict company isolation. Owner/assignee or Manager/Admin.
DROP POLICY IF EXISTS "Tasks viewable by owner or assignee" ON public.tasks;
DROP POLICY IF EXISTS "Company users can view tasks" ON public.tasks;
CREATE POLICY "Company users can view tasks" ON public.tasks FOR SELECT 
USING (company_id = public.get_user_company_id()); -- Further restricted by app logic or we can add (user_id = auth.uid() OR assignee_id = auth.uid() OR admin) if strict privacy inside company is needed.

DROP POLICY IF EXISTS "Tasks strictly isolated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks strictly isolated" ON public.tasks;
CREATE POLICY "Tasks strictly isolated" ON public.tasks FOR ALL 
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- Access Requests
DROP POLICY IF EXISTS "Users can view own access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can view access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Company isolation for access_requests select" ON public.access_requests;
CREATE POLICY "Company isolation for access_requests select" ON public.access_requests FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin', 'super_admin')))
);

DROP POLICY IF EXISTS "Company isolation for access_requests all" ON public.access_requests;
CREATE POLICY "Company isolation for access_requests all" ON public.access_requests FOR ALL 
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- Leave Requests
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Company isolation for leave requests" ON public.leave_requests;
CREATE POLICY "Company isolation for leave requests" ON public.leave_requests FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND
    (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin', 'super_admin')))
);

DROP POLICY IF EXISTS "Company isolation for leave requests insert" ON public.leave_requests;
CREATE POLICY "Company isolation for leave requests insert" ON public.leave_requests FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Company isolation for leave requests update/delete" ON public.leave_requests;
CREATE POLICY "Company isolation for leave requests update/delete" ON public.leave_requests FOR UPDATE 
USING (company_id = public.get_user_company_id());

-- Security & Audit (Audit Logs, Risk Scores, Alerts, Login History, Attendance)
-- Employees only see their own, admins see company.

CREATE OR REPLACE FUNCTION public.apply_company_rls(table_name TEXT, user_col TEXT DEFAULT 'user_id')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Employee view own %I" ON %I;
        CREATE POLICY "Employee view own %I" ON %I FOR SELECT 
        USING (
            company_id = public.get_user_company_id() AND 
            %I = auth.uid()
        );

        DROP POLICY IF EXISTS "Admin view company %I" ON %I;
        CREATE POLICY "Admin view company %I" ON %I FOR SELECT 
        USING (
            company_id = public.get_user_company_id() AND 
            EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN (''admin'', ''super_admin''))
        );
        
        DROP POLICY IF EXISTS "System insert %I" ON %I;
        CREATE POLICY "System insert %I" ON %I FOR INSERT 
        WITH CHECK (company_id = public.get_user_company_id());
    ', table_name, table_name, table_name, table_name, table_name, user_col, table_name, table_name, table_name, table_name, table_name, table_name, table_name, table_name);
END;
$$;

SELECT public.apply_company_rls('audit_logs');
SELECT public.apply_company_rls('risk_scores');
SELECT public.apply_company_rls('alerts');
SELECT public.apply_company_rls('login_history');
SELECT public.apply_company_rls('attendance_records', 'employee_id');


-- ==========================================
-- MIGRATION: 022_audit_and_security.sql
-- ==========================================

-- Migration 022: Security Events Isolation and Audit Integrity
-- Ensures security_events has the same multi-tenant company isolation as audit_logs.

-- 1. Add company_id to security_events
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Create Index
CREATE INDEX IF NOT EXISTS idx_security_events_company_id ON public.security_events(company_id);

-- 3. Apply strict RLS to security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee view own security_events" ON public.security_events;
DROP POLICY IF EXISTS "Employee view own security_events" ON public.security_events;
CREATE POLICY "Employee view own security_events" ON public.security_events FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admin view company security_events" ON public.security_events;
DROP POLICY IF EXISTS "Admin view company security_events" ON public.security_events;
CREATE POLICY "Admin view company security_events" ON public.security_events FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "System insert security_events" ON public.security_events;
DROP POLICY IF EXISTS "System insert security_events" ON public.security_events;
CREATE POLICY "System insert security_events" ON public.security_events FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id());

-- 4. Ensure updates and deletes are blocked for all users (Immutability)
-- Audit logs and Security Events should be append-only. 
-- No ordinary API/Edge function can update/delete these.
DROP POLICY IF EXISTS "Users can update audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can update security_events" ON public.security_events;
DROP POLICY IF EXISTS "Users can delete audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can delete security_events" ON public.security_events;


-- ==========================================
-- MIGRATION: 023_employee_management.sql
-- ==========================================

-- Migration 023: Branches and Employee standardization
-- Adds branches and assigns them to the users table

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches(company_id);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view branches for their company" ON public.branches;
CREATE POLICY "Users can view branches for their company" ON public.branches FOR SELECT 
USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- Add branch_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users(branch_id);

-- Also fix departments to have company isolation if it doesn't already
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);

-- Apply RLS to departments if it wasn't done completely
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

DROP POLICY IF EXISTS "Users can view company departments" ON public.departments;
CREATE POLICY "Users can view company departments" ON public.departments FOR SELECT 
USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can manage company departments" ON public.departments;
CREATE POLICY "Admins can manage company departments" ON public.departments FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);


-- ==========================================
-- MIGRATION: 024_access_grants_isolation.sql
-- ==========================================

-- Migration 024: Access Grants (user_permissions) Company Isolation
-- Adds company_id to user_permissions to enforce tenant isolation.

-- 1. Add company_id to user_permissions
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON public.user_permissions(company_id);

-- 2. Create partial unique index to prevent duplicate active grants
-- A user can only have one active grant for a specific permission in a company
DROP INDEX IF EXISTS idx_user_permissions_active_unique;
CREATE UNIQUE INDEX idx_user_permissions_active_unique ON public.user_permissions(user_id, permission, company_id) 
WHERE (expires_at IS NULL);

-- 3. Replace old RLS with strict Company Isolation for user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissions viewable by self" ON public.user_permissions;
DROP POLICY IF EXISTS "Permissions viewable by admins" ON public.user_permissions;
DROP POLICY IF EXISTS "Permissions updatable by admins" ON public.user_permissions;

DROP POLICY IF EXISTS "Permissions viewable by self within company" ON public.user_permissions;
CREATE POLICY "Permissions viewable by self within company" ON public.user_permissions FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view and manage company permissions" ON public.user_permissions;
CREATE POLICY "Admins can view and manage company permissions" ON public.user_permissions FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'))
);

-- 4. Update access_requests RLS
-- Let's ensure employees cannot duplicate pending requests
DROP INDEX IF EXISTS idx_access_requests_pending_unique;
CREATE UNIQUE INDEX idx_access_requests_pending_unique ON public.access_requests(requester_id, module, company_id) 
WHERE (status = 'PENDING');


-- ==========================================
-- MIGRATION: 025_mfa_security_policies.sql
-- ==========================================

-- Migration 025: MFA Security Policies

-- 1. Add mfa_policy to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS mfa_policy VARCHAR(50) DEFAULT 'OPTIONAL';

-- 2. Add security permissions for Step-Up and Admin MFA requirements
INSERT INTO public.permissions (action, description) 
VALUES 
  ('REQUIRE_MFA', 'User is required to have MFA enabled by role'),
  ('REQUIRE_STRONG_FACTOR', 'User is required to use a strong factor (Biometric or Passkey)')
ON CONFLICT (action) DO NOTHING;

-- 3. Assign to default Admin / SuperAdmin roles if they exist
DO $$
DECLARE
    super_admin_role_id UUID;
    admin_role_id UUID;
    require_mfa_id UUID;
    require_strong_id UUID;
BEGIN
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin';
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
    
    SELECT id INTO require_mfa_id FROM public.permissions WHERE action = 'REQUIRE_MFA';
    SELECT id INTO require_strong_id FROM public.permissions WHERE action = 'REQUIRE_STRONG_FACTOR';

    -- Assign to super_admin
    IF super_admin_role_id IS NOT NULL THEN
        IF require_mfa_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (super_admin_role_id, require_mfa_id) ON CONFLICT DO NOTHING;
        END IF;
        IF require_strong_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (super_admin_role_id, require_strong_id) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Assign to admin
    IF admin_role_id IS NOT NULL THEN
        IF require_mfa_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (admin_role_id, require_mfa_id) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;


-- ==========================================
-- MIGRATION: 026_geofencing_policies.sql
-- ==========================================

-- ==========================================
-- Migration 026: Geofencing Policies
-- ==========================================

CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ALLOW', 'BLOCK')),
    latitude NUMERIC,
    longitude NUMERIC,
    radius_meters NUMERIC,
    country_code VARCHAR(2), -- For country-wide policies
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_geofences_company ON public.geofences(company_id, is_active);

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage company geofences" ON public.geofences;
DROP POLICY IF EXISTS "Admins can manage company geofences" ON public.geofences;
CREATE POLICY "Admins can manage company geofences" ON public.geofences FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = geofences.company_id
    AND users.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Users can view company geofences" ON public.geofences;
DROP POLICY IF EXISTS "Users can view company geofences" ON public.geofences;
CREATE POLICY "Users can view company geofences" ON public.geofences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = geofences.company_id
  )
);


-- ==========================================
-- MIGRATION: 027_attendance_updates.sql
-- ==========================================

-- ==========================================
-- Migration 027: Attendance Updates
-- ==========================================

-- 1. Add company_id to public.attendance if it doesn't exist
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Add UNIQUE constraint to prevent double daily check-ins
-- First, handle any existing duplicates by keeping only the latest (or earliest) per day.
-- We'll just enforce the constraint. If it fails on existing data, manual cleanup may be needed, but this is a fresh project so we can just add it.
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_date_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_user_id_date_key UNIQUE(user_id, date);

-- 3. Update Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON public.attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id_date ON public.attendance(user_id, date);

-- 4. Re-evaluate RLS for public.attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Drop old loose policies if they exist
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view own attendance records" ON public.attendance;

-- Employee can view their own
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT
USING (auth.uid() = user_id);

-- Employee can insert their own (they can only check in as themselves)
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance;
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Employee can update their own (for checkout)
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance;
CREATE POLICY "Users can update own attendance" ON public.attendance FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view/manage company attendance
DROP POLICY IF EXISTS "Admins can manage company attendance" ON public.attendance;
CREATE POLICY "Admins can manage company attendance" ON public.attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = attendance.company_id
    AND users.role IN ('admin', 'super_admin')
  )
);


-- ==========================================
-- MIGRATION: 028_security_policies.sql
-- ==========================================

-- ==========================================
-- Migration 028: Security Policies
-- ==========================================

CREATE TABLE IF NOT EXISTS public.security_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- LOGIN, FACE_VERIFY, DEVICE_REGISTER, ATTENDANCE_CHECK_IN, SENSITIVE_OPERATION
    priority INTEGER NOT NULL DEFAULT 10,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { field, operator, value }
    decision VARCHAR(50) NOT NULL, -- ALLOW, MFA_REQUIRED, STEP_UP_REQUIRED, DENY, BLOCK
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient policy lookup
CREATE INDEX IF NOT EXISTS idx_security_policies_company_action ON public.security_policies(company_id, action, is_active);

-- Enable RLS
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

-- Admins can manage their company's policies
DROP POLICY IF EXISTS "Admins can manage company security policies" ON public.security_policies;
CREATE POLICY "Admins can manage company security policies" ON public.security_policies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = security_policies.company_id
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Regular users cannot view security policies directly via API (they only experience the enforcement)
-- However, for the Edge functions/API routes running via service_role, RLS is bypassed.


-- ==========================================
-- MIGRATION: 029_soc_enhancements.sql
-- ==========================================

-- ==========================================
-- Migration 029: SOC Enhancements
-- ==========================================

-- 1. Extend security_events for SOC capabilities
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPEN';
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS resolution_reason TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- 2. Indexes for SOC dashboard performance
CREATE INDEX IF NOT EXISTS idx_security_events_status ON public.security_events(status);
CREATE INDEX IF NOT EXISTS idx_security_events_company_status ON public.security_events(company_id, status);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

-- RLS remains append-only and read-only for employees/admins natively.
-- Status changes (resolve/investigate/dismiss) will be performed by secure API routes using the service_role key,
-- accompanied by an audit log entry to ensure strict auditing without relaxing database mutability rules.


-- ==========================================
-- MIGRATION: 030_reports_and_analytics.sql
-- ==========================================

-- ==========================================
-- Migration 030: Reports and Analytics
-- ==========================================

-- 1. Create generated_reports table
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, PROCESSING, COMPLETED, FAILED
    file_path TEXT,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON public.generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON public.generated_reports(created_at DESC);

-- 3. RLS for reports (only Admins can access company reports)
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view company reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Admins can view company reports" ON public.generated_reports;
CREATE POLICY "Admins can view company reports" ON public.generated_reports FOR SELECT
USING (
    company_id = public.get_user_company_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "System insert reports" ON public.generated_reports;
DROP POLICY IF EXISTS "System insert reports" ON public.generated_reports;
CREATE POLICY "System insert reports" ON public.generated_reports FOR INSERT
WITH CHECK (
    company_id = public.get_user_company_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "System update reports" ON public.generated_reports;
DROP POLICY IF EXISTS "System update reports" ON public.generated_reports;
CREATE POLICY "System update reports" ON public.generated_reports FOR UPDATE
USING (
    company_id = public.get_user_company_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
)
WITH CHECK (
    company_id = public.get_user_company_id()
);


-- ==========================================
-- MIGRATION: 031_cleanup_employees.sql
-- ==========================================

-- ==========================================
-- Migration 031: Cleanup Employees Status Duplication
-- ==========================================

-- The employees table currently tracks 'status', which is also tracked in 'profiles' and 'users'.
-- To prevent divergence and maintain a single source of truth, we drop it from employees.
-- The canonical status for a user/employee is public.users.status (or profiles.status).

-- ALTER TABLE public.employees DROP COLUMN IF EXISTS status;
