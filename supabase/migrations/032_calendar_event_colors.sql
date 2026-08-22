-- Calendar event colors
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS color VARCHAR(50);
