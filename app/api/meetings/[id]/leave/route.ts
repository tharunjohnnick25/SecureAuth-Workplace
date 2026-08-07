import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { user_id, end_meeting } = body;

    const meeting = MockDB.meetings.find((m: any) => m.id === id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const pIdx = MockDB.meeting_participants.findIndex(
      (p: any) => p.meeting_id === id && p.user_id === user_id
    );
    if (pIdx !== -1) {
      MockDB.meeting_participants[pIdx].status = 'LEFT';
    }

    if (end_meeting) {
      meeting.status = 'ENDED';
    }

    saveMockDB();

    return NextResponse.json({ data: { status: 'LEFT' }, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
