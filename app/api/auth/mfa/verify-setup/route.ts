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
      return NextResponse.json({
        success: true,
        recoveryCodes: generateRecoveryCodes(),
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const recoveryCodes = generateRecoveryCodes();
    const { error: updateError } = await supabase.rpc('update_user_mfa', {
      p_user_id: user.id,
      p_mfa_enabled: true,
      p_recovery_codes: JSON.stringify(recoveryCodes),
    });
    if (updateError) {
      // Fallback direct update
      await supabase.from('users').update({
        is_mfa_enabled: true,
      } as any).eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      recoveryCodes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 10 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.charAt(Math.floor(Math.random() * 32))
    ).join('');
    codes.push(code.match(/.{5}/g)!.join('-'));
  }
  return codes;
}
