-- ==========================================
-- Migration 027: Attendance Updates
-- ==========================================

-- 1. Add company_id to public.attendance if it doesn't exist
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Add UNIQUE constraint to prevent double daily check-ins
-- First, handle any existing duplicates by keeping only the latest (or earliest) per day.
-- We'll just enforce the constraint. If it fails on existing data, manual cleanup may be needed, but this is a fresh project so we can just add it.
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_date_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_user_id_date_key UNIQUE(user_id, date);

-- 3. Update Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON public.attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id_date ON public.attendance(user_id, date);

-- 4. Re-evaluate RLS for public.attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Drop old loose policies if they exist
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view own attendance records" ON public.attendance;

-- Employee can view their own
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT
USING (auth.uid() = user_id);

-- Employee can insert their own (they can only check in as themselves)
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Employee can update their own (for checkout)
CREATE POLICY "Users can update own attendance" ON public.attendance FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view/manage company attendance
CREATE POLICY "Admins can manage company attendance" ON public.attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = attendance.company_id
    AND users.role IN ('admin', 'super_admin')
  )
);
