import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // In a production app, we would use the googleapis package:
  // const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  // const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/gmail.readonly'] });
  
  // Since we are building for the mock environment, we will mock the redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/gmail/callback`;
  
  // Fake Google OAuth Consent Screen URL that immediately redirects back
  const mockGoogleConsentUrl = `${redirectUri}?code=mock_gmail_oauth_code_12345&state=gmail_integration`;
  
  return NextResponse.redirect(mockGoogleConsentUrl);
}
