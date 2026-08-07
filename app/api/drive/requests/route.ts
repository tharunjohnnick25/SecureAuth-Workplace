import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

// Get requests or Create a request
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ data: MockDB.file_access_requests, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_name, file_id, file_name, reason } = body;

    if (!user_id || !file_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newReq = {
      id: `req-${Date.now()}`,
      user_id,
      user_name,
      file_id,
      file_name,
      reason,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    MockDB.file_access_requests.push(newReq as any);
    
    // Notify admin
    MockDB.notifications.push({
      id: `notif-${Date.now()}`,
      user_id: 'admin-1',
      type: 'ACCESS_REQUEST',
      title: 'File Access Request',
      message: `${user_name} requested access to ${file_name}.`,
      is_read: false,
      action_url: '/workspace',
      created_at: new Date().toISOString()
    } as any);

    // Audit Log
    MockDB.drive_audit_logs.push({
      id: `audit-${Date.now()}`,
      user_id,
      file_id,
      action: 'ACCESS_REQUEST',
      file_name,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.1',
      risk_score: 12
    } as any);

    saveMockDB();

    return NextResponse.json({ data: newReq, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Approve or Reject request
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { request_id, status, admin_id } = body; // status = 'APPROVED' or 'REJECTED'

    if (!request_id || !status) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const reqIdx = MockDB.file_access_requests.findIndex((r: any) => r.id === request_id);
    if (reqIdx === -1) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    MockDB.file_access_requests[reqIdx].status = status;
    const accessReq = MockDB.file_access_requests[reqIdx];

    // Notify employee
    MockDB.notifications.push({
      id: `notif-${Date.now()}`,
      user_id: accessReq.user_id,
      type: 'ACCESS_UPDATE',
      title: 'File Access Updated',
      message: `Your request for ${accessReq.file_name} was ${status.toLowerCase()}.`,
      is_read: false,
      action_url: '/workspace',
      created_at: new Date().toISOString()
    } as any);

    saveMockDB();

    return NextResponse.json({ data: accessReq, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
