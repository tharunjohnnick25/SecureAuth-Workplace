-- Hardware Persistence Table for Devices

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_type VARCHAR(100),
    os VARCHAR(100),
    browser VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    is_trusted BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Policies for devices
CREATE POLICY "Users can view their own devices" 
ON public.devices FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all devices" 
ON public.devices FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.designation ILIKE '%admin%'
  )
);
