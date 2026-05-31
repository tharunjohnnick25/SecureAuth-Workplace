import { supabase } from '@/lib/supabase';

export const AdminService = {
  getUsers: async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  getAuditLogs: async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  },

  updateUserStatus: async (userId: string, status: string) => {
    const { error } = await (supabase.from('users') as any)
      .update({ status })
      .eq('id', userId);
    if (error) throw error;
  },

  updateUserRole: async (userId: string, role: string) => {
    const { error } = await (supabase.from('users') as any)
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }
};
