import { apiClient } from '@/lib/api-client';
import { Department, DepartmentAnalytics, DepartmentFormData } from '@/types/departments';
import { ApiResponse } from '@/types/api';

export const DepartmentService = {
  getDepartments: async (): Promise<Department[]> => {
    const res = await apiClient.get<ApiResponse<Department[]>>('/api/departments');
    return res.data || [];
  },

  getDepartment: async (id: string): Promise<Department> => {
    const res = await apiClient.get<ApiResponse<Department>>(`/api/departments/${id}`);
    if (!res.data) throw new Error('Department not found');
    return res.data;
  },

  createDepartment: async (data: DepartmentFormData): Promise<Department> => {
    const res = await apiClient.post<ApiResponse<Department>>('/api/departments', data);
    if (!res.data) throw new Error('Failed to create department');
    return res.data;
  },

  updateDepartment: async (id: string, data: Partial<DepartmentFormData>): Promise<Department> => {
    const res = await apiClient.put<ApiResponse<Department>>(`/api/departments/${id}`, data);
    if (!res.data) throw new Error('Failed to update department');
    return res.data;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/api/departments/${id}`);
  },

  setDepartmentHead: async (id: string, headId: string | null): Promise<Department> => {
    const res = await apiClient.put<ApiResponse<Department>>(`/api/departments/${id}/head`, { head_id: headId });
    if (!res.data) throw new Error('Failed to set department head');
    return res.data;
  },

  getDepartmentAnalytics: async (): Promise<DepartmentAnalytics> => {
    const res = await apiClient.get<ApiResponse<DepartmentAnalytics>>('/api/departments/analytics');
    if (!res.data) throw new Error('Failed to load analytics');
    return res.data;
  },
};
