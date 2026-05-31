import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ✅ Safe fallbacks prevent build-time crash when env vars are not yet set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookie mutations are no-ops here.
          // The middleware handles session refresh in that case.
        }
      },
    },
  });
}

/**
 * Admin client — uses service_role key to bypass RLS.
 * ONLY use this in server-side API routes, never in Client Components.
 */
export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // no-op in Server Components
        }
      },
    },
  });
}
