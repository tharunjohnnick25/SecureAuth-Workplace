import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { factorId, code } = await req.json();

    if (isMockMode()) {
      if (!code || String(code).replace(/\D/g, '').length !== 6) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
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
