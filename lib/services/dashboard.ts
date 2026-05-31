import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  failedAttempts: number;
  mfaEnabledPercent: number;
}

export const DashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gt('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: failedCount } = await supabase
      .from('login_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'FAILURE')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: mfaCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('mfa_enabled', true);

    const total = userCount || 1;
    const mfaEnabledPercent = Math.round(((mfaCount || 0) / total) * 100);

    return {
      totalUsers: userCount || 0,
      activeSessions: sessionCount || 0,
      failedAttempts: failedCount || 0,
      mfaEnabledPercent,
    };
  },

  getRecentActivities: async () => {
    const { data } = await supabase
      .from('login_logs')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .limit(10);

    return (data || []).map((log: any) => ({
      id: log.id,
      user: log.users?.email || 'Unknown',
      action: log.status === 'SUCCESS' ? 'Login successful' : 'Login failed',
      timestamp: log.created_at,
      status: log.status === 'SUCCESS' ? 'success' : 'danger',
      ip: log.ip_address,
    }));
  },

  getSecurityAlerts: async () => {
    const { data } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return (data || []).map((alert: any) => ({
      id: alert.id,
      type: alert.event_type?.replace(/_/g, '') || 'Alert',
      message: alert.details?.message || `Security event detected`,
      severity: alert.severity?.toLowerCase() || 'medium',
      time: alert.created_at
    }));
  },

  getAttendance: async () => {
    const { data } = await supabase
      .from('login_logs')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  },

  getDepartments: async () => {
    const { data } = await supabase
      .from('departments')
      .select('*');
    return (data || []).map((dept: any) => ({
      id: dept.id,
      name: dept.name || 'Unknown',
      head: dept.head || 'Unassigned',
      employees: dept.employee_count || 0,
      risk: (dept.avg_risk_score || 0) > 60 ? 'High' : (dept.avg_risk_score || 0) > 30 ? 'Medium' : 'Low'
    }));
  }
};
