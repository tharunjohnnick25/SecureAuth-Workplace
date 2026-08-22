import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';

export async function getUserProfile(userId: string | null) {
  if (!userId) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  return data || null;
}

export async function recordAuthEvent(event: { user_id?: string | null; company_id?: string | null; type: string; ip?: string; user_agent?: string; details?: any }) {
  await logAuditEvent(
    event.user_id || null,
    event.company_id || null,
    {
      action: event.type,
      resource: 'auth',
      details: event.details || null
    }
  );
}
