-- ==========================================
-- Migration 030: Reports and Analytics
-- ==========================================

-- 1. Create generated_reports table
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, PROCESSING, COMPLETED, FAILED
    file_path TEXT,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON public.generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON public.generated_reports(created_at DESC);

-- 3. RLS for reports (only Admins can access company reports)
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view company reports" ON public.generated_reports;
CREATE POLICY "Admins can view company reports" ON public.generated_reports FOR SELECT
USING (
    company_id = public.get_user_company_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "System insert reports" ON public.generated_reports;
CREATE POLICY "System insert reports" ON public.generated_reports FOR INSERT
WITH CHECK (
    company_id = public.get_user_company_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "System update reports" ON public.generated_reports;
CREATE POLICY "System update reports" ON public.generated_reports FOR UPDATE
USING (
    company_id = public.get_user_company_id() AND
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
)
WITH CHECK (
    company_id = public.get_user_company_id()
);
