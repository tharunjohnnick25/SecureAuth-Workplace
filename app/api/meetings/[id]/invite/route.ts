import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const meeting = MockDB.meetings.find((m: any) => m.id === id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const exists = MockDB.meeting_participants.some(
      (p: any) => p.meeting_id === id && p.user_id === user_id
    );
    if (!exists) {
      MockDB.meeting_participants.push({
        meeting_id: id,
        user_id,
        status: 'INVITED',
      } as any);

      MockDB.notifications.push({
        id: `notif-${Date.now()}-${Math.random()}`,
        user_id,
        type: 'MEETING_INVITE',
        title: 'New Meeting Invitation',
        message: `You have been invited to: ${meeting.title} on ${meeting.date} at ${meeting.start_time}`,
        is_read: false,
        action_url: `/meetings/${id}/pre-join`,
        created_at: new Date().toISOString(),
      } as any);

      saveMockDB();
    }

    return NextResponse.json({ data: { invited: true }, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
