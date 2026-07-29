export interface Department {
  id: string;
  name: string;
  head: string | null;
  head_id?: string | null;
  employee_count: number;
  avg_risk_score: number;
  description?: string;
  created_at: string;
  updated_at?: string;
  head_details?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface DepartmentAnalytics {
  totalDepartments: number;
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  avgEmployeesPerDept: number;
  largestDepartment: string;
  smallestDepartment: string;
  departments: {
    name: string;
    head: string | null;
    employeeCount: number;
    activeCount: number;
    inactiveCount: number;
  }[];
}

export interface DepartmentFormData {
  name: string;
  head?: string;
  description?: string;
}
