-- Migration 007: Employee Self Service and Tasks

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Progress, Completed, Approved
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Attachments Table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Requests Table
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- LEAVE, PROFILE_UPDATE, DOCUMENT, TASK
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    data_payload JSONB,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- TASK_ASSIGNED, LEAVE_APPROVED, PROFILE_UPDATED, SYSTEM_ALERT
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tasks Policies
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);
CREATE POLICY "Users can update their tasks" ON public.tasks FOR UPDATE USING (auth.uid() = assigned_to);
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

-- Attachments Policies
CREATE POLICY "Users can view attachments for their tasks" ON public.task_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND (assigned_to = auth.uid() OR assigned_by = auth.uid()))
);
CREATE POLICY "Users can upload attachments for their tasks" ON public.task_attachments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND assigned_to = auth.uid())
);
CREATE POLICY "Admins can view all task attachments" ON public.task_attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

-- Approvals Policies
CREATE POLICY "Users can view their own requests" ON public.approval_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Users can create requests" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Admins can manage all approvals" ON public.approval_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true); -- Simplified for backend insert
