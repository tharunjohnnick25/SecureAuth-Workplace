-- ==========================================
-- Migration 028: Security Policies
-- ==========================================

CREATE TABLE IF NOT EXISTS public.security_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- LOGIN, FACE_VERIFY, DEVICE_REGISTER, ATTENDANCE_CHECK_IN, SENSITIVE_OPERATION
    priority INTEGER NOT NULL DEFAULT 10,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { field, operator, value }
    decision VARCHAR(50) NOT NULL, -- ALLOW, MFA_REQUIRED, STEP_UP_REQUIRED, DENY, BLOCK
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient policy lookup
CREATE INDEX IF NOT EXISTS idx_security_policies_company_action ON public.security_policies(company_id, action, is_active);

-- Enable RLS
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

-- Admins can manage their company's policies
CREATE POLICY "Admins can manage company security policies" ON public.security_policies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = security_policies.company_id
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Regular users cannot view security policies directly via API (they only experience the enforcement)
-- However, for the Edge functions/API routes running via service_role, RLS is bypassed.
