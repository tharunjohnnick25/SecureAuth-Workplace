/**
 * lib/oauth.ts — Client-side OAuth sign-in helper for Google / GitHub.
 * Starts the Supabase OAuth flow and returns to /auth/callback.
 */

export type OAuthProvider = 'google' | 'github';

export async function signInWithOAuth(provider: OAuthProvider) {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  // Clear any stale session that might interfere with the OAuth exchange.
  try {
    await supabase.auth.signOut();
  } catch {}
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('secureauth-session');
    } catch {}
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
}
