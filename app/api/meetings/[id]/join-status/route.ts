import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('user_id') || session.user.id;

    // Fetch meeting status
    const { data: meeting, error: mErr } = await supabase.from('meetings').select('status').eq('id', id).single();
    if (mErr) {
      if (mErr.code === '42P01') return NextResponse.json({ success: true, data: { participant_status: 'IN_CALL', meeting_status: 'LIVE' } });
      throw mErr;
    }

    // Fetch participant status
    const { data: participant } = await supabase
      .from('meeting_participants')
      .select('status')
      .eq('meeting_id', id)
      .eq('user_id', targetUserId)
      .single();

    return NextResponse.json({ 
      success: true, 
      data: { 
        participant_status: participant?.status || 'WAITING', 
        meeting_status: meeting.status 
      } 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
