import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { verifyTotp } from '@/services/auth/mfa';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (isMockMode()) {
      const sessionCookie = req.cookies.get('mock_session')?.value;
      let userId = 'mock-user-id';
      
      if (sessionCookie) {
         try {
            const session = JSON.parse(sessionCookie);
            if (session.id) userId = session.id;
         } catch(e) {}
      }

      const user = MockEmployees.getById(userId);
      if (!user || !user.totp_secret) {
         return NextResponse.json({ error: 'MFA setup not initiated' }, { status: 400 });
      }

      if (!code || String(code).replace(/\D/g, '').length !== 6) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      const isValid = verifyTotp(user.totp_secret, String(code).trim());

      if (!isValid) {
         return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
      }

      MockEmployees.update(userId, { totp_enrolled: true });

      return NextResponse.json({
        success: true,
        recoveryCodes: generateRecoveryCodes(),
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
    
    const { data: userData, error: dbError } = await adminClient
      .from('users')
      .select('company_id, status, mfa_secret')
      .eq('id', user.id)
      .single();

    if (userData?.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    let isValid = false;

    if (userData?.mfa_secret) {
        isValid = verifyTotp(userData.mfa_secret, String(code).trim());
    }

    if (!isValid) {
      await logAuditEvent(
        user.id,
        userData?.company_id || null,
        {
          action: 'TOTP_VERIFICATION_FAILED',
          resource: 'auth.mfa.totp',
          details: { reason: 'invalid_code' },
        },
        req
      );
      return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
    }

    // Since Native MFA is disabled, we do NOT issue AAL2 natively.
    // Instead we rely entirely on our robust middleware and `mfa_verified` state which blocks access if TOTP is enabled but not verified.
    
    await adminClient
      .from('users')
      .update({
        is_mfa_enabled: true,
        totp_enabled: true,
      })
      .eq('id', user.id);

    await logAuditEvent(
      user.id,
      userData?.company_id || null,
      {
        action: 'TOTP_ENROLLMENT_COMPLETED',
        resource: 'auth.mfa.totp',
        details: { method: 'custom' },
      },
      req
    );

    const recoveryCodes = generateRecoveryCodes();

    return NextResponse.json({
      success: true,
      recoveryCodes,
    });
  } catch (err: any) {
    console.error('TOTP Verify Setup Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  for (let i = 0; i < 8; i++) {
    const randomBytes = crypto.randomBytes(10);
    let code = '';
    for (let b = 0; b < 10; b++) {
      code += chars.charAt(randomBytes[b] % chars.length);
    }
    codes.push(code.match(/.{5}/g)!.join('-'));
  }
  return codes;
}
