-- Create a security definer function to get the current user's role safely without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::VARCHAR FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Fix the recursion in public.users policies
DROP POLICY IF EXISTS "Users can view profiles within company" ON public.users;
CREATE POLICY "Users can view profiles within company" ON public.users FOR SELECT 
USING (
    id = auth.uid() OR 
    (company_id = public.get_user_company_id() AND public.get_current_user_role() IN ('manager', 'admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can manage users in company" ON public.users;
CREATE POLICY "Admins can manage users in company" ON public.users FOR ALL 
USING (
    company_id = public.get_user_company_id() AND 
    public.get_current_user_role() IN ('admin', 'super_admin')
);
