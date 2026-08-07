-- Migration: 002_roles_and_permissions.sql
-- Create roles table and populate default data

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create policies (only admins can manage roles)
CREATE POLICY "Admins can manage roles" ON public.roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'Admin'
        )
    );

-- Allow read access for authenticated users (to check their own permissions if needed)
CREATE POLICY "Authenticated users can read roles" ON public.roles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Insert default roles if not exist
INSERT INTO public.roles (name, description, permissions, is_system)
VALUES 
    ('Super Admin', 'Full access to all system features', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"analytics":true,"settings":true,"access_requests":true,"user_management":true}', true),
    ('HR Manager', 'Manage HR operations', '{"dashboard":true,"employees":true,"departments":true,"attendance":true,"leave":true,"payroll":true,"reports":true,"access_requests":true}', false),
    ('Employee', 'Standard employee access', '{"dashboard":true,"attendance":true,"leave":true,"reports":false}', false)
ON CONFLICT (name) DO NOTHING;
