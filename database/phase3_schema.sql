-- Phase 3 Schema Migrations: Cloud Drive, Leaves, and Approvals

-- 1. Documents Table (Shared between /documents Vault and /workspace Drive)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT, -- e.g., 'Resume', 'Aadhaar/ID', 'Other'
    document_name TEXT NOT NULL,
    name TEXT, -- UI alias for Drive
    file_size BIGINT,
    mime_type TEXT,
    file_url TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Leaves Table (For Leave Requests)
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'Sick Leave', 'Vacation'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Approvals Table (For Admin Inbox: Documents, Leaves, Drive Requests)
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL, -- 'DOCUMENT', 'LEAVE', 'DRIVE_ACCESS'
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    data_payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- the admin who approved/rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Drive Requests Table (Alternative for /workspace drive requests if kept separate)
CREATE TABLE IF NOT EXISTS public.drive_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    file_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_requests ENABLE ROW LEVEL SECURITY;

-- Note: Policies omitted for brevity. Supabase Service Role (adminClient) bypasses RLS.
