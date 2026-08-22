import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { generateTotpSecret } from '@/services/auth/mfa';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    if (isMockMode()) {
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

      const totpData = await generateTotpSecret(email);
      MockEmployees.update(userId, { totp_secret: totpData.base32, totp_enrolled: false });

      return NextResponse.json({
        id: 'mock-totp-factor',
        type: 'totp',
        totp: {
          qr_code: totpData.qrCode,
          secret: totpData.base32,
          uri: totpData.otpauth_url,
        },
      });
    }

    let supabase = await createServerSupabaseClient();
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    const pendingSessionStr = req.cookies.get('mfa_pending_session')?.value;
    if (pendingSessionStr) {
      try { 
         const tokens = JSON.parse(pendingSessionStr);
         accessToken = tokens.access_token; 
         refreshToken = tokens.refresh_token;
      } catch(e) {}
    }

    if (accessToken && refreshToken) {
       supabase = createClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
         { auth: { persistSession: false } }
       ) as any;
       
       await supabase.auth.setSession({
           access_token: accessToken,
           refresh_token: refreshToken
       });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminClient
      .from('users')
      .select('company_id, status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    const totpData = await generateTotpSecret(user.email || '');

    // Keep our custom table synced with the new secret, but mark as NOT verified yet
    await adminClient
      .from('users')
      .update({
        mfa_secret: totpData.base32,
        is_mfa_enabled: false, 
        totp_enabled: false,
      })
      .eq('id', user.id);

    await logAuditEvent(
      user.id,
      profile?.company_id || null,
      {
        action: 'TOTP_ENROLLMENT_STARTED',
        resource: 'auth.mfa.totp',
        details: { factor_type: 'totp', method: 'custom' },
      },
      req
    );

    return NextResponse.json({
      id: 'custom-totp-factor',
      type: 'totp',
      totp: {
        qr_code: totpData.qrCode,
        secret: totpData.base32,
        uri: totpData.otpauth_url,
      },
    });

  } catch (err: any) {
    console.error('TOTP Setup Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
