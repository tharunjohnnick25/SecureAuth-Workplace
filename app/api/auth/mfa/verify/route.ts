import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';
import { verify } from 'otplib';

export async function POST(req: NextRequest) {
  try {
    const { factorId, code, user: bodyUser, tempToken } = await req.json();

    if (isMockMode()) {
      // For mock mode, get the user from the mock session cookie
      const sessionCookie = req.cookies.get('mock_session')?.value;
      let userId = 'mock-user-id';
      
      if (sessionCookie) {
         try {
            const session = JSON.parse(sessionCookie);
            if (session.id) userId = session.id;
         } catch(e) {}
      } else {
         if (bodyUser?.id) {
             userId = bodyUser.id;
         }
      }

      const user = MockEmployees.getById(userId);
      if (!user || !user.totp_secret || !user.totp_enrolled) {
         return NextResponse.json({ error: 'TOTP is not enrolled for this user' }, { status: 400 });
      }

      if (!code || String(code).replace(/\D/g, '').length !== 6) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      const isValid = verify({ token: code, secret: user.totp_secret });
      
      if (!isValid) {
         return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
      }

      // Important: Set the session cookie now that MFA is verified
      const response = NextResponse.json({ success: true });
      response.cookies.set('mock_session', JSON.stringify(user), { httpOnly: true, path: '/' });

      return response;
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      if (user) {
        await Promise.all([
          supabase.from('login_logs').insert({
            user_id: user.id,
            ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
            status: 'FAILURE',
            risk_level: 'MEDIUM',
            created_at: new Date().toISOString(),
          } as any),
          supabase.from('login_history').insert({
            user_id: user.id,
            ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
            status: 'failed',
            failure_reason: 'Invalid MFA verification code',
            created_at: new Date().toISOString(),
          } as any),
        ]);
      }
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (user) {
      await Promise.all([
        supabase.from('login_logs').insert({
          user_id: user.id,
          ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'SUCCESS',
          risk_level: 'LOW',
          created_at: new Date().toISOString(),
        } as any),
        supabase.from('login_history').insert({
          user_id: user.id,
          ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'success',
          created_at: new Date().toISOString(),
        } as any),
        supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'mfa_verified',
          resource: 'auth.mfa.verify',
          details: { factorId },
          ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
          created_at: new Date().toISOString(),
        } as any),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
