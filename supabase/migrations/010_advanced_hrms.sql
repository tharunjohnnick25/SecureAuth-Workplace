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

CREATE POLICY "Calendar viewable by self" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

CREATE POLICY "Calendar insertable by self or admin" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

CREATE POLICY "Calendar updatable by self or admin" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

CREATE POLICY "Calendar deletable by self or admin" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
