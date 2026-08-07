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

CREATE POLICY "Access Requests viewable by self" ON access_requests
  FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Access Requests viewable by admins" ON access_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Access Requests insertable by self" ON access_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
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
CREATE POLICY "Permissions viewable by self" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Permissions viewable by admins" ON user_permissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
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
CREATE POLICY "Trust scores viewable by self" ON trust_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Trust scores viewable by admins" ON trust_scores
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Trust scores managed by system" ON trust_scores
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
