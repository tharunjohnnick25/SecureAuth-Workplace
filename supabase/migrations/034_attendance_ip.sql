-- Attendance: capture network IP for login/logout records
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
