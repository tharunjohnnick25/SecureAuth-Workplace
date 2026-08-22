import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { user_id, approve } = body;

    // Verify host
    const { id } = await context.params;
    const { data: meeting } = await supabase.from('meetings').select('host_id').eq('id', id).single();
    if (meeting?.host_id !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('meeting_participants')
      .update({ status: approve ? 'JOINED' : 'DENIED', joined_at: approve ? new Date().toISOString() : null })
      .eq('meeting_id', id)
      .eq('user_id', user_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
