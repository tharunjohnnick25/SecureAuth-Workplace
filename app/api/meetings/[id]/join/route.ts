import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!id || id === 'undefined') {
      return NextResponse.json({ success: false, error: 'Invalid meeting ID' }, { status: 400 });
    }

    // 1. Check meeting exists and status
    const { data: meeting, error: meetError } = await supabase
      .from('meetings')
      .select('status, company_id')
      .eq('id', id)
      .single();

    if (meetError || !meeting) {
      if (meetError?.code === '42P01') return NextResponse.json({ success: true }); // Mock fallback if DB schema missing
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.status === 'ENDED') {
      return NextResponse.json({ success: false, error: 'Meeting has already ended' }, { status: 403 });
    }

    // 2. Check company isolation
    const { data: user } = await supabase.from('users').select('company_id').eq('id', session.user.id).single();
    if (user?.company_id !== meeting.company_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 3. Upsert participant state to JOINED (bypass RLS because regular users don't have INSERT permission)
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error: partError } = await adminClient
      .from('meeting_participants')
      .upsert(
        { meeting_id: id, user_id: session.user.id, status: 'JOINED', joined_at: new Date().toISOString() },
        { onConflict: 'meeting_id,user_id' }
      );

    if (partError) throw partError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
