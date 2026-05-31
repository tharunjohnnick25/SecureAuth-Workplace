import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
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
