import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function listActiveSessions(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('sessions').select('*').eq('user_id', userId).order('last_active', { ascending: false });
  return data || [];
}

export async function revokeSession(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  await supabase.from('sessions').update({ is_active: false }).eq('id', sessionId);
}

export async function revokeAllSessions(userId: string) {
  const supabase = await createServerSupabaseClient();
  await supabase.from('sessions').update({ is_active: false }).eq('user_id', userId);
}
