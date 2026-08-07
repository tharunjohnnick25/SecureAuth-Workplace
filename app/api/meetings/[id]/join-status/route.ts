import { NextRequest, NextResponse } from 'next/server';
import { MockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    const meeting = MockDB.meetings.find((m: any) => m.id === id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const participant = MockDB.meeting_participants.find(
      (p: any) => p.meeting_id === id && p.user_id === userId
    );

    return NextResponse.json({
      data: {
        meeting_status: meeting.status,
        participant_status: participant?.status || 'NOT_JOINED',
        host_id: meeting.host_id,
      },
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
