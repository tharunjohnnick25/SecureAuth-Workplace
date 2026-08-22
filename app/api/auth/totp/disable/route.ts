import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyTotp } from '@/services/auth/mfa';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { currentPassword, code } = await req.json();

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminClient
      .from('users')
      .select('company_id, status, mfa_secret')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    // Require Re-authentication via Password or current TOTP Code
    let reauthPassed = false;

    if (currentPassword) {
      const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const rawSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const authClient = createClient(rawSupabaseUrl, rawSupabaseKey, { auth: { persistSession: false } });
      const { error: pwdErr } = await authClient.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (!pwdErr) {
        reauthPassed = true;
      }
    }

    if (!reauthPassed && code && profile?.mfa_secret) {
      reauthPassed = verifyTotp(profile.mfa_secret, String(code).trim());
    }

    if (!reauthPassed) {
      return NextResponse.json({ error: 'Re-authentication required to disable Authenticator App. Please provide your password or current authenticator code.' }, { status: 401 });
    }

    // Disable TOTP in database
    await adminClient
      .from('users')
      .update({
        totp_enabled: false,
        is_mfa_enabled: false,
        mfa_enabled: false,
        mfa_secret: null,
      })
      .eq('id', user.id);

    await logAuditEvent(
      user.id,
      profile?.company_id || null,
      {
        action: 'TOTP_DISABLED',
        resource: 'auth.mfa.totp',
        details: { factor_type: 'totp' },
      },
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Authenticator App disabled successfully.',
    });

  } catch (err: any) {
    console.error('TOTP Disable Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
