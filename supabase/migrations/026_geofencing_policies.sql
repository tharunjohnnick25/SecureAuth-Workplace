-- ==========================================
-- Migration 026: Geofencing Policies
-- ==========================================

CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ALLOW', 'BLOCK')),
    latitude NUMERIC,
    longitude NUMERIC,
    radius_meters NUMERIC,
    country_code VARCHAR(2), -- For country-wide policies
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_geofences_company ON public.geofences(company_id, is_active);

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage company geofences" ON public.geofences;
CREATE POLICY "Admins can manage company geofences" ON public.geofences FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = geofences.company_id
    AND users.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Users can view company geofences" ON public.geofences;
CREATE POLICY "Users can view company geofences" ON public.geofences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = geofences.company_id
  )
);
