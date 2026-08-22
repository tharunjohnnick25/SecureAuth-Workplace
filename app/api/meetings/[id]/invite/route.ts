import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { user_id } = body;

    // 1. Verify meeting and company isolation
    const { id } = await context.params;
    const { data: meeting } = await supabase.from('meetings').select('title, company_id').eq('id', id).single();
    if (!meeting) return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });

    const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', user_id).single();
    if (targetUser?.company_id !== meeting.company_id) {
        return NextResponse.json({ success: false, error: 'Forbidden: Cannot invite outside company' }, { status: 403 });
    }

    // 2. Insert participant
    const { error } = await supabase
      .from('meeting_participants')
      .upsert({ meeting_id: id, user_id, role: 'PARTICIPANT', status: 'INVITED' }, { onConflict: 'meeting_id,user_id' });

    if (error) throw error;

    // 3. Notify user
    await sendNotification(supabase, {
        user_id,
        title: 'Meeting Invitation',
        message: `You have been invited to join: ${meeting.title}`,
        type: 'INFO'
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
