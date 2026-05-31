import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { factorId } = await req.json();
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await Promise.all([
      supabase.from('users').update({
        is_mfa_enabled: false,
      } as any).eq('id', user.id),
      supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'mfa_unenrolled',
        resource: 'auth.mfa.unenroll',
        details: { factorId },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unenroll MFA factor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
