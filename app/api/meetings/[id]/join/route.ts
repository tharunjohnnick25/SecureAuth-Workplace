import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { user_id, password, face_verified, risk_score } = body;

    const meeting = MockDB.meetings.find((m: any) => m.id === id);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // 1. Password check
    if (meeting.password && meeting.password !== password) {
      return NextResponse.json({ error: 'Invalid meeting password' }, { status: 401 });
    }

    // 2. Risk Score check (assuming scores > 80 are critical/blocked)
    if (risk_score && risk_score > 80) {
      return NextResponse.json({ error: 'Access Denied: High AI Risk Score detected.' }, { status: 403 });
    }

    // 3. Face Auth check
    if (meeting.face_auth_required && !face_verified) {
      return NextResponse.json({ error: 'Face Verification is required for this secure meeting.' }, { status: 403 });
    }

    // Find or create participant
    let pIdx = MockDB.meeting_participants.findIndex((p: any) => p.meeting_id === id && p.user_id === user_id);
    
    // If not invited but trying to join (public meeting scenario), add them
    if (pIdx === -1) {
      if (meeting.type === 'Private') {
         return NextResponse.json({ error: 'This meeting is private and you are not on the invite list.' }, { status: 403 });
      }
      MockDB.meeting_participants.push({
        meeting_id: id,
        user_id,
        status: 'JOINING'
      } as any);
      pIdx = MockDB.meeting_participants.length - 1;
    }

    // Determine entry status based on Waiting Room setting
    let entryStatus = 'IN_CALL';
    if (meeting.waiting_room && meeting.host_id !== user_id) {
      entryStatus = 'WAITING';
    }

    MockDB.meeting_participants[pIdx].status = entryStatus;

    // Host joining starts the live meeting
    if (meeting.host_id === user_id && meeting.status !== 'LIVE') {
      meeting.status = 'LIVE';
    }

    saveMockDB();

    return NextResponse.json({ 
      data: { status: entryStatus, meeting }, 
      success: true 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
