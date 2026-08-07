-- Migration 018: Focus Mode & Time-Blocking
-- Per-user focus blocks. While a user is inside an active block, the server
-- suppresses (does not create) non-critical notifications addressed to them,
-- so they can get uninterrupted deep work.

CREATE TABLE IF NOT EXISTS public.focus_mode (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    -- JSON array of { start: 'HH:MM', end: 'HH:MM', days: number[] } (0 = Sunday)
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- When true, CRITICAL / SECURITY style alerts still get delivered during focus.
    allow_critical BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_focus_mode_user
    ON public.focus_mode (user_id);

ALTER TABLE public.focus_mode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own focus mode" ON public.focus_mode;
CREATE POLICY "Users can view own focus mode" ON public.focus_mode
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own focus mode" ON public.focus_mode;
CREATE POLICY "Users can manage own focus mode" ON public.focus_mode
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Backend insert for admin/service contexts.
DROP POLICY IF EXISTS "Service can insert focus mode" ON public.focus_mode;
CREATE POLICY "Service can insert focus mode" ON public.focus_mode
  FOR INSERT WITH CHECK (true);
