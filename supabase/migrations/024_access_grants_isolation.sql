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

CREATE POLICY "Permissions viewable by self within company" ON public.user_permissions FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    user_id = auth.uid()
);

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
