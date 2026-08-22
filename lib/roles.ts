/**
 * lib/roles.ts — Role definitions and role-based routing helpers for the new RBAC system.
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: Role[] = [
  ROLES.ADMIN,
];

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 2,
  [ROLES.EMPLOYEE]: 1,
};

/**
 * Returns the home route for a given role.
 */
export function getRoleHomePath(role: string): string {
  const r = role.toLowerCase() as Role;
  if (ADMIN_ROLES.includes(r)) return '/admin/users';
  if (r === ROLES.MANAGER) return '/manager/dashboard';
  return '/dashboard';
}

export const ROUTE_PERMISSIONS = {
  '/admin': [ROLES.ADMIN],
  '/manager': [ROLES.ADMIN, ROLES.MANAGER],
  '/employee': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/settings': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/admin/users': [ROLES.ADMIN],
  '/admin/audit': [ROLES.ADMIN],
};
