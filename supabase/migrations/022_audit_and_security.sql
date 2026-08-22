-- Migration 022: Security Events Isolation and Audit Integrity
-- Ensures security_events has the same multi-tenant company isolation as audit_logs.

-- 1. Add company_id to security_events
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Create Index
CREATE INDEX IF NOT EXISTS idx_security_events_company_id ON public.security_events(company_id);

-- 3. Apply strict RLS to security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee view own security_events" ON public.security_events;
CREATE POLICY "Employee view own security_events" ON public.security_events FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admin view company security_events" ON public.security_events;
CREATE POLICY "Admin view company security_events" ON public.security_events FOR SELECT 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

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
