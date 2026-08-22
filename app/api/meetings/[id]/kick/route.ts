import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const targetUserId = body.user_id;
    if (!targetUserId) return NextResponse.json({ success: false, error: 'Participant user_id required' }, { status: 400 });

    // Verify user is host or admin
    const { id } = await context.params;
    const { data: meeting } = await supabase.from('meetings').select('host_id, company_id').eq('id', id).single();
    if (!meeting) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { data: user } = await supabase.from('users').select('role, company_id').eq('id', session.user.id).single();
    if (meeting.host_id !== session.user.id && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, error: 'Only the host can kick participants' }, { status: 403 });
    }

    // Set participant status to KICKED
    const { error } = await supabase
      .from('meeting_participants')
      .update({ status: 'KICKED', left_at: new Date().toISOString() })
      .eq('meeting_id', id)
      .eq('user_id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
