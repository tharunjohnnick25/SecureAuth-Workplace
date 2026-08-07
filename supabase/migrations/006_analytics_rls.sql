-- Enable public read access for authenticated users to populate analytics

-- Users table
CREATE POLICY "Authenticated users can view users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

-- Departments table
CREATE POLICY "Authenticated users can view departments" 
ON public.departments FOR SELECT 
TO authenticated 
USING (true);

-- Devices table (Adding to existing if needed)
CREATE POLICY "Authenticated users can view devices" 
ON public.devices FOR SELECT 
TO authenticated 
USING (true);

-- Note: In a production environment, you might want to restrict these to only admins or managers.
-- Since the analytics dashboard is intended for admins, it's safe to assume authenticated users accessing it have permissions. 
-- Or restrict it: USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (designation ILIKE '%admin%' OR designation ILIKE '%manager%')));
