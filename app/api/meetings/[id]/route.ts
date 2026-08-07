import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { MockEmployees } from '@/lib/mock-employees';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    const meeting = MockDB.meetings.find((m: any) => m.id === id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const participants = MockDB.meeting_participants
      .filter((p: any) => p.meeting_id === id)
      .map((p: any) => {
        const emp = MockEmployees.getById(p.user_id);
        return {
          ...p,
          user_name: emp?.full_name || p.user_id,
          role: emp?.role || 'Member',
        };
      });

    const host = MockEmployees.getById(meeting.host_id);

    return NextResponse.json({ data: { ...meeting, host_name: host?.full_name || meeting.host_id, participants }, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    
    const meetingIdx = MockDB.meetings.findIndex((m: any) => m.id === id);
    if (meetingIdx === -1) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Merge updates
    MockDB.meetings[meetingIdx] = {
      ...MockDB.meetings[meetingIdx],
      ...body
    };

    saveMockDB();

    return NextResponse.json({ data: MockDB.meetings[meetingIdx], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
