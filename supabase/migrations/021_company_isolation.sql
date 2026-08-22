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
CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (id = public.get_user_company_id());

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
CREATE POLICY "Users can view profiles within company" ON public.users FOR SELECT 
USING (
    id = auth.uid() OR 
    (company_id = public.get_user_company_id() AND EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin', 'super_admin')))
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    -- Protect sensitive fields from being updated directly (handled via RPC/triggers if needed)
);

-- Admins can update/manage users in their own company
DROP POLICY IF EXISTS "Admins can manage users in company" ON public.users;
CREATE POLICY "Admins can manage users in company" ON public.users FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin'))
);

-- Departments Table
-- Strict company isolation
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Users can view company departments" ON public.departments FOR SELECT 
USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
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
CREATE POLICY "Company users can view tasks" ON public.tasks FOR SELECT 
USING (company_id = public.get_user_company_id()); -- Further restricted by app logic or we can add (user_id = auth.uid() OR assignee_id = auth.uid() OR admin) if strict privacy inside company is needed.

DROP POLICY IF EXISTS "Tasks strictly isolated" ON public.tasks;
CREATE POLICY "Tasks strictly isolated" ON public.tasks FOR ALL 
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- Access Requests
DROP POLICY IF EXISTS "Users can view own access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can view access requests" ON public.access_requests;
CREATE POLICY "Company isolation for access_requests select" ON public.access_requests FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    (requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin', 'super_admin')))
);

CREATE POLICY "Company isolation for access_requests all" ON public.access_requests FOR ALL 
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- Leave Requests
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
CREATE POLICY "Company isolation for leave requests" ON public.leave_requests FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND
    (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('manager', 'admin', 'super_admin')))
);

CREATE POLICY "Company isolation for leave requests insert" ON public.leave_requests FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id() AND user_id = auth.uid());

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
