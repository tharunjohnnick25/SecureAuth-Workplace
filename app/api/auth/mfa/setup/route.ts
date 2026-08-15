import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  try {
    if (isMockMode()) {
      // For mock mode, get the user from the mock session cookie
      const sessionCookie = req.cookies.get('mock_session')?.value;
      let userId = 'mock-user-id';
      let email = 'user@example.com';
      
      if (sessionCookie) {
         try {
            const session = JSON.parse(sessionCookie);
            if (session.id) userId = session.id;
            if (session.email) email = session.email;
         } catch(e) {}
      }

      // Generate a real secret using otplib
      const secret = generateSecret();
      
      // Generate the otpauth URI
      const uri = generateURI({ label: email, issuer: 'SecureAuth', secret });
      
      // Generate QR Code as Data URL
      const qr_code = await QRCode.toDataURL(uri);

      // Temporarily store it in MockEmployees (we'll mark it enrolled upon verification)
      MockEmployees.update(userId, { totp_secret: secret, totp_enrolled: false });

      return NextResponse.json({
        id: 'mock-totp-factor',
        type: 'totp',
        totp: {
          qr_code,
          secret,
          uri,
        },
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'mfa_enroll_requested',
      resource: 'auth.mfa.setup',
      details: { factorId: data.id, type: data.type },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      created_at: new Date().toISOString(),
    } as any);

    return NextResponse.json({
      id: data.id,
      type: data.type,
      totp: {
        qr_code: data.totp?.qr_code,
        secret: data.totp?.secret,
        uri: data.totp?.uri,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
