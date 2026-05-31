import { createServerSupabaseClient } from './supabase/server';

export async function getDashboardStats() {
  const supabase = await createServerSupabaseClient();

  const { count: totalLogins } = await supabase
    .from('login_logs')
    .select('*', { count: 'exact', head: true });

  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: activeDevices } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('is_trusted', true);

  return {
    totalLogins: totalLogins || 0,
    activeDevices: activeDevices || 0,
    recentNotifications: recentNotifications || [],
  };
}

export async function getLoginTrends() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('login_logs')
    .select('created_at, status')
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}
