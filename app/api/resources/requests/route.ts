import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  
  if (!(MockDB as any).employee_requests) {
    (MockDB as any).employee_requests = [];
  }

  const requests = userId 
    ? (MockDB as any).employee_requests.filter((r: any) => r.user_id === userId)
    : (MockDB as any).employee_requests;

  return NextResponse.json({ success: true, data: requests });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!(MockDB as any).employee_requests) {
      (MockDB as any).employee_requests = [];
    }

    const newRequest = {
      id: `req-${Date.now()}`,
      user_id: body.user_id || 'mock',
      email: body.email || '',
      user_name: body.user_name || '',
      reason: body.reason,
      status: body.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    (MockDB as any).employee_requests.push(newRequest);
    saveMockDB();

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
