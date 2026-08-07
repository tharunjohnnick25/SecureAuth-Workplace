-- Migration: 004_update_roles.sql
-- Add permissions and is_system columns to roles table

ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Insert default roles if not exist
INSERT INTO public.roles (name, description, permissions, is_system)
VALUES 
    ('Super Admin', 'Full access to all system features', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"analytics":true,"settings":true,"access_requests":true,"user_management":true}', true),
    ('HR Manager', 'Manage HR operations', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"access_requests":true}', false),
    ('Employee', 'Standard employee access', '{"dashboard":true,"attendance":true,"leave":true,"reports":false}', false)
ON CONFLICT (name) DO NOTHING;
