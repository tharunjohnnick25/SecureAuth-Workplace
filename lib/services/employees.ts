import { apiClient } from '@/lib/api-client';
import { Employee, EmployeeDocument, ImportResult } from '@/types/employees';
import { ApiResponse } from '@/types/api';

export const EmployeeService = {
  getEmployees: async (params?: {
    search?: string;
    department?: string;
    designation?: string;
    status?: string;
    gender?: string;
    employment_type?: string;
    manager_id?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{ data: Employee[]; total: number }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) searchParams.set(key, String(val));
      });
    }
    const res = await apiClient.get<ApiResponse<Employee[]> & { total: number }>(
      `/api/employees?${searchParams.toString()}`
    );
    return { data: res.data || [], total: res.total || 0 };
  },

  getEmployee: async (id: string): Promise<Employee> => {
    const res = await apiClient.get<ApiResponse<Employee>>(`/api/employees/${id}`);
    if (!res.data) throw new Error('Employee not found');
    return res.data;
  },

  createEmployee: async (data: Partial<Employee>): Promise<Employee> => {
    const res = await apiClient.post<ApiResponse<Employee>>('/api/employees', data);
    if (!res.data) throw new Error('Failed to create employee');
    return res.data;
  },

  updateEmployee: async (id: string, data: Partial<Employee>): Promise<Employee> => {
    const res = await apiClient.put<ApiResponse<Employee>>(`/api/employees/${id}`, data);
    if (!res.data) throw new Error('Failed to update employee');
    return res.data;
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/api/employees/${id}`);
  },

  getDocuments: async (employeeId: string): Promise<EmployeeDocument[]> => {
    const res = await apiClient.get<ApiResponse<EmployeeDocument[]>>(`/api/employees/${employeeId}/documents`);
    return res.data || [];
  },

  uploadDocument: async (employeeId: string, file: File, documentType: string): Promise<EmployeeDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    const res = await fetch(`/api/employees/${employeeId}/documents`, { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Upload failed');
    return json.data;
  },

  deleteDocument: async (employeeId: string, documentId: string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/api/employees/${employeeId}/documents?document_id=${documentId}`);
  },

  importEmployees: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/employees/import', { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Import failed');
    return json.data;
  },

  exportEmployees: async (format: string = 'csv', filters?: { ids?: string[]; status?: string; department?: string }) => {
    const searchParams = new URLSearchParams({ format });
    if (filters?.ids?.length) searchParams.set('ids', filters.ids.join(','));
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.department) searchParams.set('department', filters.department);

    const res = await fetch(`/api/employees/export?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getActiveEmployees: async (): Promise<Employee[]> => {
    const { data } = await EmployeeService.getEmployees({ status: 'Active', limit: 500 });
    return data;
  },
};
