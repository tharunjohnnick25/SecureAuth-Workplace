import { createClient as createClientJS, type Session } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { createCapacitorAwareFetch, isRunningInCapacitor } from '@/lib/capacitor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const SESSION_STORAGE_KEY = 'secureauth-session';

let _client: ReturnType<typeof createClientJS<Database>> | null = null;

function getClient(): ReturnType<typeof createClientJS<Database>> {
  if (!_client) {
    const existingSession = typeof window !== 'undefined' ? restoreSession() : null;
    const isCapacitor = typeof window !== 'undefined' ? isRunningInCapacitor() : false;
    _client = createClientJS<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !isCapacitor,
        storageKey: SESSION_STORAGE_KEY,
        ...(existingSession ? { initialSession: existingSession } : {}),
        ...(isCapacitor ? { flowType: 'pkce' } : {}),
      },
      global: {
        fetch: createCapacitorAwareFetch(),
      },
    });
  }
  return _client;
}

export function restoreSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch {}
  return null;
}

export const createClient = () => getClient();

export const supabase = new Proxy({} as ReturnType<typeof createClientJS<Database>>, {
  get(_, prop) {
    return getClient()[prop as keyof ReturnType<typeof createClientJS<Database>>];
  },
});
