export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORGANIZATION_OWNER'
  | 'ORGANIZATION_ADMIN'
  | 'SECURITY_ANALYST'
  | 'HR_MANAGER'
  | 'TEAM_MANAGER'
  | 'EMPLOYEE'
  | 'GUEST_USER'
  | 'ADMIN'  // Retain legacy roles for complete backwards compatibility
  | 'USER';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string; // Keep as string for dynamic DB roles compatibility
  organization_id?: string;
  department?: string;
  created_at: string;
  last_login?: string;
  mfa_enabled: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}
