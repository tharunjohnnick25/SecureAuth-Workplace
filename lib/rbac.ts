// Enterprise RBAC & Role Hierarchy Definitions

export type UserRole =
  | 'ORGANIZATION_OWNER'
  | 'ORGANIZATION_ADMIN'
  | 'SECURITY_ANALYST'
  | 'HR_MANAGER'
  | 'TEAM_MANAGER'
  | 'EMPLOYEE'
  | 'GUEST_USER'
  | 'ADMIN'
  | 'USER';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const PERMISSIONS: Permission[] = [
  { id: 'manage_users', name: 'Manage Users', description: 'Create, update, suspend, and delete team members', category: 'User Management' },
  { id: 'manage_departments', name: 'Manage Departments', description: 'Configure organizational departments and structures', category: 'User Management' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Access standard dashboard reports and graphs', category: 'Dashboard & Analytics' },
  { id: 'export_reports', name: 'Export Reports', description: 'Download CSV, Excel, and PDF reports of audits or metrics', category: 'Dashboard & Analytics' },
  { id: 'manage_security', name: 'Manage Security', description: 'Configure MFA rules, risk assessments, and scanning parameters', category: 'Security' },
  { id: 'manage_integrations', name: 'Manage Integrations', description: 'Configure active third-party LDAP and SaaS plugins', category: 'Security' },
  { id: 'approve_access_requests', name: 'Approve Access Requests', description: 'Authorize employee requests for system permissions', category: 'Governance' },
  { id: 'manage_attendance', name: 'Manage Attendance', description: 'Review check-ins, remote logs, and occupancy metrics', category: 'Governance' },
  { id: 'manage_devices', name: 'Manage Devices', description: 'Register, edit trust levels, or revoke team hardware tokens', category: 'Security' },
];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ORGANIZATION_OWNER: 70,
  ORGANIZATION_ADMIN: 60,
  ADMIN: 60,
  SECURITY_ANALYST: 50,
  HR_MANAGER: 40,
  TEAM_MANAGER: 30,
  EMPLOYEE: 20,
  USER: 20,
  GUEST_USER: 10,
};

// Default mapping of roles to active permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ORGANIZATION_OWNER: [
    'manage_users',
    'manage_departments',
    'view_analytics',
    'export_reports',
    'manage_security',
    'manage_integrations',
    'approve_access_requests',
    'manage_attendance',
    'manage_devices',
  ],
  ORGANIZATION_ADMIN: [
    'manage_users',
    'manage_departments',
    'view_analytics',
    'export_reports',
    'manage_security',
    'approve_access_requests',
    'manage_attendance',
    'manage_devices',
  ],
  SECURITY_ANALYST: [
    'view_analytics',
    'manage_security',
    'manage_devices',
  ],
  HR_MANAGER: [
    'view_analytics',
    'export_reports',
    'manage_attendance',
  ],
  TEAM_MANAGER: [
    'view_analytics',
    'approve_access_requests',
    'manage_attendance',
  ],
  EMPLOYEE: [
    'view_analytics',
  ],
  GUEST_USER: [],
  ADMIN: [
    'manage_users',
    'manage_departments',
    'view_analytics',
    'export_reports',
    'manage_security',
    'approve_access_requests',
    'manage_attendance',
    'manage_devices',
  ],
  USER: [
    'view_analytics',
  ],
};

// Centralized permission checking logic
export function hasPermission(
  role: string | undefined | null,
  permission: string,
  customRolePermissions?: Record<string, string[]>
): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase() as UserRole;
  
  // Custom permissions map override if loaded dynamically from database
  if (customRolePermissions && customRolePermissions[normalizedRole]) {
    return customRolePermissions[normalizedRole].includes(permission);
  }

  // Fallback to static mapping
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[normalizedRole];
  return rolePermissions ? rolePermissions.includes(permission) : false;
}

// Compare roles for authorization levels
export function isHigherRole(roleA: string, roleB: string): boolean {
  const weightA = ROLE_HIERARCHY[roleA.toUpperCase() as UserRole] || 0;
  const weightB = ROLE_HIERARCHY[roleB.toUpperCase() as UserRole] || 0;
  return weightA > weightB;
}

// User-friendly role labeling
export function getRoleLabel(role: string | undefined | null): string {
  if (!role) return 'Guest User';
  const labelMap: Record<string, string> = {
    ORGANIZATION_OWNER: 'Organization Owner',
    ORGANIZATION_ADMIN: 'Organization Admin',
    SECURITY_ANALYST: 'Security Analyst',
    HR_MANAGER: 'HR Manager',
    TEAM_MANAGER: 'Team Manager',
    EMPLOYEE: 'Employee',
    GUEST_USER: 'Guest User',
  };
  return labelMap[role.toUpperCase()] || role;
}
