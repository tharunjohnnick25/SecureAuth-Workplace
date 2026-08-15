import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/session
 *
 * Called by the OAuth callback page after the client completes the Supabase
 * token exchange. Validates the access token, then persists the session into
 * server-side cookies so API routes / Server Components see the user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, refresh_token } = body || {};

    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

    // Validate the token before trusting it from the client.
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.auth.getUser(access_token);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { error: setError } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || undefined,
    });
    if (setError) {
      return NextResponse.json({ error: setError.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
