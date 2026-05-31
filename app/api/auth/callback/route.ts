import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API-prefixed OAuth callback — kept for backward compat with any links
 * that use /api/auth/callback. Delegates to the same logic as /auth/callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { id: userId, email, user_metadata } = data.user;

      // ✅ Upsert profile (no email domain restriction — supports Google AND GitHub)
      const { data: profile } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            email: email ?? '',
            full_name: user_metadata?.full_name ?? user_metadata?.name ?? email?.split('@')[0] ?? '',
            avatar_url: user_metadata?.avatar_url ?? user_metadata?.picture ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        .select('role')
        .single();

      // ✅ Role-based redirect
      const role = ((profile?.role as string) || 'employee').toUpperCase();

      let redirectPath: string;
      if (next) {
        redirectPath = next;
      } else if (['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN'].includes(role)) {
        redirectPath = '/admin/dashboard';
      } else if (role === 'SECURITY_ANALYST') {
        redirectPath = '/security';
      } else {
        redirectPath = '/dashboard';
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?message=Authentication+failed`);
}
