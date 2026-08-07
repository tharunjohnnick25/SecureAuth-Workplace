import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';

export async function POST(req: NextRequest) {
  try {
    const { factorId, code } = await req.json();

    if (isMockMode()) {
      if (!code || String(code).replace(/\D/g, '').length !== 6) {
        return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
      }
      return NextResponse.json({ success: true, verifyData: { verified: true, factorId } });
    }

    const supabase = await createServerSupabaseClient();

    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (verifyError) {
      // Log failed MFA attempt
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('login_history').insert({
          user_id: user.id,
          ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
          status: 'failed',
          failure_reason: 'Invalid MFA code'
        });
      }
      return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 });
    }

    return NextResponse.json({ success: true, verifyData });
  } catch (error) {
    console.error('MFA Verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
