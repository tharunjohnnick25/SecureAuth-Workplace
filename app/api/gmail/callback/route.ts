import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/mail?error=no_code', req.url));
  }
  
  // In a real app we'd exchange the code for an access token and save it to the DB here.
  // We'll set a cookie to pretend we're authenticated.
  
  const redirectUrl = new URL('/mail?gmail_connected=true', req.url);
  const response = NextResponse.redirect(redirectUrl);
  
  // Set a mock cookie to remember Gmail authentication
  response.cookies.set({
    name: 'gmail_auth_token',
    value: 'mock_gmail_access_token',
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });
  
  return response;
}
