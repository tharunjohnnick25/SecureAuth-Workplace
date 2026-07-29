export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  status: string;
  created_at: string;
}

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
  employees?: number;
  risk?: 'Low' | 'Medium' | 'High';
  head_details?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  failedAttempts: number;
  mfaEnabledPercent: number;
}

export interface RecentActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  status: 'success' | 'danger';
  ip: string;
}

export interface SecurityAlert {
  id: string;
  type: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  time: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
  users?: { email: string };
}
