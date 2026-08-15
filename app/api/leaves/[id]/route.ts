import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!['Approved', 'Rejected', 'Manager Approved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status', success: false }, { status: 400 });
    }

    const leaveIndex = MockDB.leave_requests.findIndex((l) => l.id === id);
    if (leaveIndex === -1) {
      return NextResponse.json({ error: 'Leave request not found', success: false }, { status: 404 });
    }

    // Update status
    MockDB.leave_requests[leaveIndex].status = status;
    const leave = MockDB.leave_requests[leaveIndex];

    // Create notification
    MockDB.notifications.push({
      id: `notif-${Date.now()}`,
      user_id: leave.user_id,
      type: `LEAVE_${status.toUpperCase()}`,
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leave.start_date} to ${leave.end_date} has been ${status.toLowerCase()}.`,
      is_read: false,
      action_url: '/leaves',
      created_at: new Date().toISOString()
    });

    saveMockDB();

    return NextResponse.json({ data: leave, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update leave request', success: false }, { status: 500 });
  }
}
