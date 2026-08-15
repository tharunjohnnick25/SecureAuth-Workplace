-- AI Risk Engine PostgreSQL Schema

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    features JSONB, -- Raw feature vector (encrypted in app layer)
    risk_score NUMERIC(5,2) NOT NULL, -- 0-100
    risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
    contributing_factors TEXT[], -- e.g., '{"unusual_location", "new_device"}'
    mfa_method VARCHAR(50),
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(255)
);

CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts(timestamp);

CREATE TABLE user_baselines (
    user_id UUID NOT NULL,
    feature_name VARCHAR(100) NOT NULL, -- e.g., 'typing_speed', 'login_hour'
    mean NUMERIC(10,4),
    std_dev NUMERIC(10,4),
    min_val NUMERIC(10,4),
    max_val NUMERIC(10,4),
    sample_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, feature_name)
);

CREATE TABLE model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type VARCHAR(50) CHECK (model_type IN ('xgboost', 'isolation_forest', 'llm', 'arcface', 'yolov8_liveness', 'resnet50_gru', 'convlstm_blink', 'res2net_voice')),
    version VARCHAR(50) NOT NULL,
    auc NUMERIC(5,4),
    trained_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE
);

-- Face Recognition Authentication Schema

ALTER TABLE employees ADD COLUMN face_embedding JSONB; -- 512-dim ArcFace embedding, encrypted
ALTER TABLE employees ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN consent_timestamp TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN consent_admin_id UUID;
ALTER TABLE employees ADD COLUMN face_enrolled_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN face_last_login_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN biometrics_is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN biometrics_deleted_at TIMESTAMPTZ;

CREATE TABLE face_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    similarity_score NUMERIC(5,4), -- 0-1
    passive_liveness_score NUMERIC(5,4), -- 0-1
    active_liveness_score NUMERIC(5,4), -- 0-1
    voice_liveness_score NUMERIC(5,4), -- 0-1 (optional)
    final_liveness_score NUMERIC(5,4) NOT NULL, -- 0-1
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(255),
    error_message TEXT
);

CREATE INDEX idx_face_login_attempts_employee_id ON face_login_attempts(employee_id);
