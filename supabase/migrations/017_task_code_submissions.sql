-- Migration 017: Task Code Submissions (Piston compiler)
-- Stores every code run an employee makes while working on an assigned task,
-- so work is persisted and reviewable by the assigning admin.

CREATE TABLE IF NOT EXISTS public.task_code_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    version VARCHAR(50),
    code TEXT NOT NULL,
    output TEXT,
    stderr TEXT,
    status VARCHAR(20) DEFAULT 'COMPILED', -- PENDING, COMPILED, ERROR, TIMEOUT
    exit_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_code_submissions_task
    ON public.task_code_submissions (task_id, user_id, created_at DESC);

ALTER TABLE public.task_code_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own task submissions" ON public.task_code_submissions;
CREATE POLICY "Users can view own task submissions" ON public.task_code_submissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own task submissions" ON public.task_code_submissions;
CREATE POLICY "Users can insert own task submissions" ON public.task_code_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all task submissions" ON public.task_code_submissions;
CREATE POLICY "Admins can view all task submissions" ON public.task_code_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'))
  );
