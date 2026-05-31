import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getUserProfile(userId: string | null) {
  if (!userId) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  return data || null;
}

export async function recordAuthEvent(event: { user_id?: string | null; type: string; ip?: string; user_agent?: string; details?: any }) {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('audit_logs').insert({
      user_id: event.user_id || null,
      action: event.type,
      resource: 'auth',
      details: event.details || null,
      ip_address: event.ip || null,
      created_at: new Date().toISOString(),
    } as any);
  } catch (err) {
    // Non-blocking logging
    console.warn('Failed to record auth event', err);
  }
}
