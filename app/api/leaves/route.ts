import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    let data = MockDB.leave_requests;

    if (userId) {
      data = data.filter((l) => l.user_id === userId);
    }

    // Sort descending by created_at
    data = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch leaves', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_name, type, start_date, end_date, reason } = body;

    if (!user_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
    }

    const newRequest = {
      id: `lr-${Date.now()}`,
      user_id,
      user_name: user_name || 'Unknown Employee',
      type: type || 'Annual Leave',
      start_date,
      end_date,
      reason: reason || '',
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    MockDB.leave_requests.push(newRequest);
    saveMockDB();

    return NextResponse.json({ data: newRequest, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create leave request', success: false }, { status: 500 });
  }
}
