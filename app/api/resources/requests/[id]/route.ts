import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status', success: false }, { status: 400 });
    }

    if (!(MockDB as any).employee_requests) {
      (MockDB as any).employee_requests = [];
    }
    const requests = (MockDB as any).employee_requests as any[];
    const requestIndex = requests.findIndex((r) => r.id === id);
    if (requestIndex === -1) {
      return NextResponse.json({ error: 'Access request not found', success: false }, { status: 404 });
    }

    requests[requestIndex].status = status;
    requests[requestIndex].updated_at = new Date().toISOString();
    const updated = requests[requestIndex];

    if (updated.user_id) {
      MockDB.notifications.push({
        id: `notif-${Date.now()}`,
        user_id: updated.user_id,
        type: `ACCESS_${status.toUpperCase()}`,
        title: `Access Request ${status}`,
        message: `Your access request has been ${status}.`,
        is_read: false,
        action_url: '/resources',
        created_at: new Date().toISOString()
      });
    }

    saveMockDB();

    return NextResponse.json({ data: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update access request', success: false }, { status: 500 });
  }
}
