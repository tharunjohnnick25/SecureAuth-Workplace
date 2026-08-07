-- Add departments table

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    head UUID REFERENCES public.users(id) ON DELETE SET NULL,
    employee_count INTEGER DEFAULT 0,
    avg_risk_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Note: The trigger public.update_department_employee_count() from 001_hrms_extension.sql
-- requires 'department' column in public.users to be a string matching 'name' in departments.
-- Let's ensure public.users has a 'department' column.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
