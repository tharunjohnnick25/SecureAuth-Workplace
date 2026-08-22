-- ============================================================
-- SECUREAUTH IAM - MAIL & MEETINGS SCHEMA MIGRATION
-- ============================================================

-- 1. INTERNAL EMAILS TABLE
CREATE TABLE IF NOT EXISTS public.internal_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    folder VARCHAR(50) NOT NULL CHECK (folder IN ('inbox', 'sent', 'trash')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for Internal Emails
ALTER TABLE public.internal_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mailbox" 
ON public.internal_emails
FOR ALL
USING (auth.uid() = owner_id);

-- 2. MEETINGS TABLE
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'ENDED')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK (type IN ('INSTANT', 'SCHEDULED')),
    face_auth_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MEETING PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'PARTICIPANT' CHECK (role IN ('HOST', 'PARTICIPANT')),
    status VARCHAR(50) NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'JOINED', 'LEFT', 'KICKED')),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(meeting_id, user_id)
);

-- RLS Policies for Meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Users can read meetings in their own company
CREATE POLICY "Users can read company meetings"
ON public.meetings
FOR SELECT
USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
);

-- Only hosts/admins can insert or update meetings
CREATE POLICY "Hosts can manage meetings"
ON public.meetings
FOR ALL
USING (
    host_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
);

-- RLS Policies for Meeting Participants
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read participants in their company meetings"
ON public.meeting_participants
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.meetings m 
        WHERE m.id = meeting_id 
        AND m.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
);

CREATE POLICY "Users can update their own participant status"
ON public.meeting_participants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can manage participants"
ON public.meeting_participants
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.meetings m 
        WHERE m.id = meeting_id 
        AND (m.host_id = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN'))
    )
);
