import { ROLES, ADMIN_ROLES, ROLE_HIERARCHY, ROUTE_PERMISSIONS } from '../lib/roles';

describe('RBAC Roles & Hierarchy', () => {
  it('should define the correct hierarchy', () => {
    expect(ROLE_HIERARCHY[ROLES.SUPER_ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[ROLES.ADMIN]);
    expect(ROLE_HIERARCHY[ROLES.ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[ROLES.MANAGER]);
    expect(ROLE_HIERARCHY[ROLES.MANAGER]).toBeGreaterThan(ROLE_HIERARCHY[ROLES.EMPLOYEE]);
  });

  it('should list correct admin roles', () => {
    expect(ADMIN_ROLES).toContain(ROLES.SUPER_ADMIN);
    expect(ADMIN_ROLES).toContain(ROLES.ADMIN);
    expect(ADMIN_ROLES).not.toContain(ROLES.MANAGER);
    expect(ADMIN_ROLES).not.toContain(ROLES.EMPLOYEE);
  });

  it('should correctly configure route permissions', () => {
    // Admin routes
    expect(ROUTE_PERMISSIONS['/admin']).toContain(ROLES.SUPER_ADMIN);
    expect(ROUTE_PERMISSIONS['/admin']).toContain(ROLES.ADMIN);
    expect(ROUTE_PERMISSIONS['/admin']).not.toContain(ROLES.EMPLOYEE);

    // Manager routes
    expect(ROUTE_PERMISSIONS['/manager']).toContain(ROLES.MANAGER);
    expect(ROUTE_PERMISSIONS['/manager']).toContain(ROLES.ADMIN);
    expect(ROUTE_PERMISSIONS['/manager']).not.toContain(ROLES.EMPLOYEE);

    // Employee routes
    expect(ROUTE_PERMISSIONS['/employee']).toContain(ROLES.EMPLOYEE);
    expect(ROUTE_PERMISSIONS['/employee']).toContain(ROLES.MANAGER);
  });
});
