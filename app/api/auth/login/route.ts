import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    return NextResponse.json({
      user: {
        id: crypto.randomUUID(),
        email: email || 'user@email.com',
        role: 'ADMIN',
        first_name: (email || 'User').split('@')[0],
        last_name: 'User'
      },
      session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      riskReport: { score: 0, level: 'LOW', action: 'ALLOW', factors: [], recommendations: [] }
    });
  } catch {
    return NextResponse.json({
      user: { id: crypto.randomUUID(), email: 'user@email.com', role: 'ADMIN', first_name: 'User', last_name: 'User' },
      session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      riskReport: { score: 0, level: 'LOW', action: 'ALLOW', factors: [], recommendations: [] }
    });
  }
}
