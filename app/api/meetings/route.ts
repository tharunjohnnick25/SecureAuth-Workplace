import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('user_id') || session.user.id;

    // Validate access
    if (targetUserId !== session.user.id) {
       const { data: currentUser } = await supabase.from('users').select('role').eq('id', session.user.id).single();
       if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
           return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
       }
    }

    // Fetch meetings where the user is a participant or host
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select(`
        *,
        host:host_id(full_name),
        participants:meeting_participants!inner(user_id)
      `)
      .eq('participants.user_id', targetUserId)
      .order('start_time', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ data: [], success: true }); // Missing schema fallback
      }
      throw error;
    }

    const formatted = (meetings || []).map(m => ({
      ...m,
      host_name: m.host?.full_name || 'Unknown',
      date: new Date(m.start_time).toISOString().split('T')[0],
      participant_count: m.participants?.length || 0,
      in_call_count: 0
    }));

    return NextResponse.json({ data: formatted, success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, description, start_time, end_time, type, participants, face_auth_required } = body;

    if (!title || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's company_id
    const { data: user } = await supabase.from('users').select('company_id').eq('id', session.user.id).single();
    if (!user?.company_id) throw new Error('Missing company context');

    // 1. Create meeting record
    const { data: newMeeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
         company_id: user.company_id,
         host_id: session.user.id,
         title,
         description: description || '',
         status: type === 'INSTANT' ? 'ACTIVE' : 'SCHEDULED',
         start_time,
         end_time,
         type: type || 'SCHEDULED',
         face_auth_required: !!face_auth_required
      })
      .select()
      .single();

    if (meetingError) {
      if (meetingError.code === '42P01') {
        return NextResponse.json({ success: false, error: 'Database migration required' }, { status: 500 });
      }
      throw meetingError;
    }

    // 2. Add Host to participants
    const participantRows = [{
      meeting_id: newMeeting.id,
      user_id: session.user.id,
      role: 'HOST',
      status: type === 'INSTANT' ? 'JOINED' : 'INVITED',
      joined_at: type === 'INSTANT' ? new Date().toISOString() : null
    }];

    // 3. Add other participants (validate company_id!)
    let invitedCount = 0;
    if (Array.isArray(participants) && participants.length > 0) {
      const { data: validUsers } = await supabase
        .from('users')
        .select('id, company_id')
        .in('id', participants)
        .eq('company_id', user.company_id);

      if (validUsers) {
        for (const vu of validUsers) {
          if (vu.id === session.user.id) continue;
          participantRows.push({
            meeting_id: newMeeting.id,
            user_id: vu.id,
            role: 'PARTICIPANT',
            status: 'INVITED',
            joined_at: null
          });
          
          await sendNotification(supabase, {
             user_id: vu.id,
             title: 'New Meeting Invitation',
             message: `You have been invited to: ${title}`,
             type: 'INFO'
          });
          invitedCount++;
        }
      }
    }

    // Insert participants
    await supabase.from('meeting_participants').insert(participantRows);

    // 4. Create calendar event if scheduled
    if (type !== 'INSTANT') {
      await supabase.from('calendar_events').insert(
        participantRows.map(pr => ({
          user_id: pr.user_id,
          title,
          description: description || '',
          start_time,
          end_time,
          type: 'MEETING'
        }))
      );
    }

    return NextResponse.json({ data: newMeeting, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
