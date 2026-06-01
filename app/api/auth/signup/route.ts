import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  return NextResponse.json({
    user: { id: crypto.randomUUID(), email: email || 'user@email.com', role: 'employee' },
    session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
  }, { status: 201 });
}
