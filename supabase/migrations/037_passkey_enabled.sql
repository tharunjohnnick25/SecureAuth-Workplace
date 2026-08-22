-- Migration 037: Add passkey_enabled flag

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passkey_enabled BOOLEAN DEFAULT FALSE;
