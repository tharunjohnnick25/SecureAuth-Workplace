-- Migration 023: Branches and Employee standardization
-- Adds branches and assigns them to the users table

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches(company_id);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branches for their company" ON public.branches FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- Add branch_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users(branch_id);

-- Also fix departments to have company isolation if it doesn't already
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);

-- Apply RLS to departments if it wasn't done completely
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

CREATE POLICY "Users can view company departments" ON public.departments FOR SELECT 
USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can manage company departments" ON public.departments FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);
