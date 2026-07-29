import { apiClient } from '@/lib/api-client';
import { DashboardStats, RecentActivity, SecurityAlert, Department, ApiResponse } from '@/types/api';

export const DashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/api/analytics/stats');
    if (!res.data) throw new Error('Failed to load stats');
    return res.data;
  },

  getRecentActivities: async (): Promise<RecentActivity[]> => {
    const res = await apiClient.get<ApiResponse<RecentActivity[]>>('/api/analytics/activities');
    return res.data || [];
  },

  getSecurityAlerts: async (): Promise<SecurityAlert[]> => {
    const res = await apiClient.get<ApiResponse<SecurityAlert[]>>('/api/analytics/alerts');
    return res.data || [];
  },

  getAttendance: async () => {
    // We can fetch attendance from activities if required, or keep it generic
    // Currently, it just mapped login logs
    const res = await apiClient.get<ApiResponse<any[]>>('/api/analytics/activities');
    return res.data || [];
  },

  getDepartments: async (): Promise<Department[]> => {
    const res = await apiClient.get<ApiResponse<Department[]>>('/api/departments');
    return res.data || [];
  },

  addDepartment: async (name: string, head?: string): Promise<Department> => {
    const res = await apiClient.post<ApiResponse<Department>>('/api/departments', { name, head });
    if (!res.data) throw new Error('Failed to create department');
    return res.data;
  }
};
