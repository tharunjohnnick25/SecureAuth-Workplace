import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!id || id === 'undefined') {
      return NextResponse.json({ success: false, error: 'Invalid meeting ID' }, { status: 400 });
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        *,
        host:host_id(full_name),
        participants:meeting_participants(user_id, role, status)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Validate access (must be same company)
    const { data: currentUser } = await supabase.from('users').select('company_id').eq('id', session.user.id).single();
    if (currentUser?.company_id !== meeting.company_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...meeting,
        host_name: meeting.host?.full_name || 'Unknown'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
