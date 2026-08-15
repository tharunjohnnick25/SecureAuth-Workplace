-- SecureAuth Enterprise Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'EMPLOYEE', -- SUPER_ADMIN, ADMIN, EMPLOYEE
    org_id UUID,
    status TEXT NOT NULL DEFAULT 'PENDING', -- ACTIVE, INACTIVE, PENDING, SUSPENDED
    mfa_enabled BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organizations Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Requests Table (for Org joining)
CREATE TABLE employee_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES organizations(id),
    status TEXT DEFAULT 'PENDING',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id)
);

-- Login Logs (Security Audit)
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    ip_address TEXT,
    user_agent TEXT,
    location JSONB,
    status TEXT NOT NULL, -- SUCCESS, FAILURE
    risk_level TEXT, -- LOW, MEDIUM, HIGH
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs (System Activity)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Active Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_token VARCHAR(500) UNIQUE NOT NULL,
    device_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trusted Devices
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    device_name TEXT,
    device_type TEXT,
    os TEXT,
    browser TEXT,
    fingerprint TEXT,
    is_trusted BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MFA Settings
CREATE TABLE mfa_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    type TEXT NOT NULL, -- TOTP, WebAuthn, SMS
    secret TEXT,
    backup_codes TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS) Policy Examples
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);

ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all login logs" ON login_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- ==========================================
-- ADAPTIVE TRUST ENGINE SCHEMA
-- ==========================================

-- Behavioral Baselines (Historical patterns for anomaly detection)
CREATE TABLE behavioral_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    avg_typing_speed INTEGER DEFAULT 50, -- WPM baseline
    typing_variance FLOAT DEFAULT 0.1,
    usual_locations JSONB DEFAULT '[]', -- Array of {city, country, ip_prefix}
    usual_devices JSONB DEFAULT '[]', -- Array of trusted device fingerprints
    usual_login_time_start TIME, -- e.g. 08:30:00
    usual_login_time_end TIME,   -- e.g. 09:30:00
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security Events (Audit log for Trust Engine inputs)
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES sessions(id),
    event_type TEXT NOT NULL, -- e.g., FACE_VERIFICATION_FAILED, NEW_DEVICE, TRUST_SCORE_CHANGED
    metadata JSONB, -- Contextual data (e.g., face match confidence, IP)
    previous_score INTEGER,
    new_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trust Scores (Live tracking of session trust)
CREATE TABLE trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) UNIQUE,
    user_id UUID REFERENCES users(id),
    score INTEGER NOT NULL DEFAULT 100, -- 0-100 scale
    risk_level TEXT NOT NULL, -- LOW_TRUST, MEDIUM_TRUST, HIGH_TRUST
    factors JSONB, -- Breakdown of what contributed to the score (e.g. { location: "anomalous", typing: "normal" })
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance (Tied securely to backend authentication completion)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES sessions(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    clock_out TIMESTAMP WITH TIME ZONE,
    device_id UUID REFERENCES devices(id),
    location JSONB,
    trust_score_at_login INTEGER,
    final_trust_score INTEGER,
    status TEXT DEFAULT 'PRESENT'
);
