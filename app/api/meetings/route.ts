import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { MockEmployees } from '@/lib/mock-employees';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Return meetings where user is host OR participant
    const userMeetingIds = MockDB.meeting_participants
      .filter((p: any) => p.user_id === userId)
      .map((p: any) => p.meeting_id);

    const meetings = MockDB.meetings
      .filter((m: any) => m.host_id === userId || userMeetingIds.includes(m.id))
      .map((m: any) => {
        const host = MockEmployees.getById(m.host_id);
        const participants = MockDB.meeting_participants.filter(
          (p: any) => p.meeting_id === m.id
        );
        return {
          ...m,
          host_name: host?.full_name || m.host_id,
          participant_count: participants.length,
          in_call_count: participants.filter((p: any) => p.status === 'IN_CALL').length,
        };
      });

    return NextResponse.json({ data: meetings, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      host_id, title, description, date, start_time, end_time, 
      type, password, waiting_room, recording_enabled, face_auth_required, participants, status 
    } = body;

    if (!host_id || !title || !date || !start_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const meetingId = `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMeeting = {
      id: meetingId,
      host_id,
      title,
      description: description || '',
      date,
      start_time,
      end_time,
      type: type || 'Private',
      password: password || '',
      waiting_room: waiting_room ?? true,
      recording_enabled: recording_enabled ?? false,
      face_auth_required: face_auth_required ?? false,
      status: status || 'SCHEDULED',
      created_at: new Date().toISOString()
    };

    MockDB.meetings.push(newMeeting as any);

    // Add participants and notify
    const invited = new Set<string>();
    if (Array.isArray(participants)) {
      participants.forEach((userId: string) => {
        if (!userId || userId === host_id || invited.has(userId)) return;
        invited.add(userId);
        MockDB.meeting_participants.push({
          meeting_id: meetingId,
          user_id: userId,
          status: 'INVITED'
        } as any);

        // Notify invited users
        MockDB.notifications.push({
          id: `notif-${Date.now()}-${Math.random()}`,
          user_id: userId,
          type: 'MEETING_INVITE',
          title: 'New Meeting Invitation',
          message: `You have been invited to: ${title} on ${date} at ${start_time}`,
          is_read: false,
          action_url: `/meetings/${meetingId}/pre-join`,
          created_at: new Date().toISOString()
        } as any);
      });
    }

    saveMockDB();

    return NextResponse.json({ data: newMeeting, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
