-- ==========================================
-- Migration 029: SOC Enhancements
-- ==========================================

-- 1. Extend security_events for SOC capabilities
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPEN';
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS resolution_reason TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- 2. Indexes for SOC dashboard performance
CREATE INDEX IF NOT EXISTS idx_security_events_status ON public.security_events(status);
CREATE INDEX IF NOT EXISTS idx_security_events_company_status ON public.security_events(company_id, status);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

-- RLS remains append-only and read-only for employees/admins natively.
-- Status changes (resolve/investigate/dismiss) will be performed by secure API routes using the service_role key,
-- accompanied by an audit log entry to ensure strict auditing without relaxing database mutability rules.
