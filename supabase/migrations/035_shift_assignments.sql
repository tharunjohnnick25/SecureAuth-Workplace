-- Migration 035: Shift Assignments
-- Persists shift roster assignments for the manager team page.
-- The legacy `users.shift_timing` column never existed in this database, so
-- shift assignments previously could not be stored.

CREATE TABLE IF NOT EXISTS public.shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    shift TEXT NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT shift_assignments_user_company_unique UNIQUE (user_id, company_id)
);

ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shift assignments viewable in company" ON public.shift_assignments;
CREATE POLICY "Shift assignments viewable in company" ON public.shift_assignments FOR SELECT
USING (
    company_id = public.get_user_company_id() AND
    (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('manager', 'admin', 'super_admin')
        )
    )
);

DROP POLICY IF EXISTS "Shift assignments writable by managers" ON public.shift_assignments;
CREATE POLICY "Shift assignments writable by managers" ON public.shift_assignments FOR INSERT
WITH CHECK (
    company_id = public.get_user_company_id() AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('manager', 'admin', 'super_admin')
    )
);

DROP POLICY IF EXISTS "Shift assignments updatable by managers" ON public.shift_assignments;
CREATE POLICY "Shift assignments updatable by managers" ON public.shift_assignments FOR UPDATE
USING (
    company_id = public.get_user_company_id() AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('manager', 'admin', 'super_admin')
    )
)
WITH CHECK (company_id = public.get_user_company_id());
