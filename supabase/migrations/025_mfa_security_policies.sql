-- Migration 025: MFA Security Policies

-- 1. Add mfa_policy to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS mfa_policy VARCHAR(50) DEFAULT 'OPTIONAL';

-- 2. Add security permissions for Step-Up and Admin MFA requirements
INSERT INTO public.permissions (action, description) 
VALUES 
  ('REQUIRE_MFA', 'User is required to have MFA enabled by role'),
  ('REQUIRE_STRONG_FACTOR', 'User is required to use a strong factor (Biometric or Passkey)')
ON CONFLICT (action) DO NOTHING;

-- 3. Assign to default Admin / SuperAdmin roles if they exist
DO $$
DECLARE
    super_admin_role_id UUID;
    admin_role_id UUID;
    require_mfa_id UUID;
    require_strong_id UUID;
BEGIN
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin';
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
    
    SELECT id INTO require_mfa_id FROM public.permissions WHERE action = 'REQUIRE_MFA';
    SELECT id INTO require_strong_id FROM public.permissions WHERE action = 'REQUIRE_STRONG_FACTOR';

    -- Assign to super_admin
    IF super_admin_role_id IS NOT NULL THEN
        IF require_mfa_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (super_admin_role_id, require_mfa_id) ON CONFLICT DO NOTHING;
        END IF;
        IF require_strong_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (super_admin_role_id, require_strong_id) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Assign to admin
    IF admin_role_id IS NOT NULL THEN
        IF require_mfa_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (admin_role_id, require_mfa_id) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
