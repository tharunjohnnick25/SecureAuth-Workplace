import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // In production, exchange code for tokens via googleapis
    const mockAccessToken = `ya29.a0AfB_by_mock_${Date.now()}`;
    const mockRefreshToken = `1//0eMockRefresh_${Date.now()}`;
    
    // Check if token exists, update or push
    const tokenObj = {
      id: 'admin-1', // Defaulting to the primary admin in Mock mode
      access_token: mockAccessToken,
      refresh_token: mockRefreshToken,
      expiry_date: Date.now() + 3600 * 1000,
      scope: 'https://www.googleapis.com/auth/drive.file',
      token_type: 'Bearer'
    };

    const existingIdx = MockDB.drive_tokens.findIndex((t: any) => t.id === 'admin-1');
    if (existingIdx > -1) {
      MockDB.drive_tokens[existingIdx] = tokenObj;
    } else {
      MockDB.drive_tokens.push(tokenObj as any);
    }
    
    saveMockDB();

    // Redirect to the Workspace page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/workspace`);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
