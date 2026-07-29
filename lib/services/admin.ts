import { apiClient } from '@/lib/api-client';
import { User, AuditLog, ApiResponse } from '@/types/api';

export const AdminService = {
  getUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<ApiResponse<User[]> | { users: User[] }>('/api/users');
    // Handle both the standard ApiResponse format and the format returned by /api/users
    if ('users' in res) {
      return res.users || [];
    }
    return (res as ApiResponse<User[]>).data || [];
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await apiClient.get<ApiResponse<AuditLog[]>>('/api/admin/audit-logs');
    return res.data || [];
  },

  updateUserStatus: async (userId: string, status: string): Promise<void> => {
    await apiClient.put<ApiResponse<any>>(`/api/users/${userId}/status`, { status });
  },

  updateUserRole: async (userId: string, role: string): Promise<void> => {
    await apiClient.put<ApiResponse<any>>(`/api/users/${userId}/role`, { role });
  }
};
