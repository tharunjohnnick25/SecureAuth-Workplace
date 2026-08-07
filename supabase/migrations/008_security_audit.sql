-- Enable RLS on core HRMS tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- 1. Tasks Policies
-- Employees can view tasks assigned to them
CREATE POLICY "Tasks viewable by assignee" ON tasks
  FOR SELECT USING (auth.uid() = assigned_to);

-- Admins can view all tasks
CREATE POLICY "Tasks viewable by admins" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin'))
  );

-- Employees can update their own tasks
CREATE POLICY "Tasks updateable by assignee" ON tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

-- Admins can insert/update/delete all tasks
CREATE POLICY "Tasks insertable by admins" ON tasks
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Tasks updatable by admins" ON tasks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Tasks deletable by admins" ON tasks
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

-- 2. Leaves Policies
CREATE POLICY "Leaves viewable by self" ON leaves
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Leaves viewable by admins" ON leaves
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Leaves insertable by self" ON leaves
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leaves updatable by admins" ON leaves
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

-- 3. Attendance Policies
CREATE POLICY "Attendance viewable by self" ON attendance
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Attendance viewable by admins" ON attendance
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Attendance insertable by self" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Attendance updatable by self" ON attendance
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Documents Policies
CREATE POLICY "Documents viewable by self" ON documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Documents viewable by admins" ON documents
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Documents insertable by self" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Documents updatable by admins" ON documents
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));

-- 5. Approvals Policies
CREATE POLICY "Approvals viewable by requester" ON approvals
  FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Approvals viewable by admins" ON approvals
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Approvals insertable by self" ON approvals
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
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
CREATE POLICY "Audit logs viewable by admins" ON audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND role IN ('ADMIN', 'super_admin')));
CREATE POLICY "Audit logs insertable by triggers" ON audit_logs
  FOR INSERT WITH CHECK (true); -- Allow internal trigger insertions
