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
CREATE POLICY "Role change logs viewable by admins" ON public.role_change_logs
    FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Role change logs insertable by admins" ON public.role_change_logs;
CREATE POLICY "Role change logs insertable by admins" ON public.role_change_logs
    FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')));
