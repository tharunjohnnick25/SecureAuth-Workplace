// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Search,
  Copy,
  Lock,
  Loader2,
} from 'lucide-react';
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  getRoleLabel,
  UserRole,
} from '@/lib/rbac';
import { useLanguage } from "@/context/LanguageContext";

interface CustomRole {
  id: string;
  name: string;
  description: string;
  users_count: number;
  editable: boolean;
  code: string;
}

export function RolesPermissions() {
    const { t } = useLanguage();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // Modal / Form state for Creating/Cloning roles
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [cloneSourceRole, setCloneSourceRole] = useState('');

  // 1. Fetch current roles & permissions mapping from Supabase (or fallback to local sandbox)
  const fetchRolesData = async () => {
    setIsLoading(true);
    try {
      // Attempt to load from DB
      const { data: dbRoles, error: rolesError } = await supabase
        .from('roles')
        .select('*');

      if (rolesError) throw rolesError;

      const { data: dbRolePerms, error: permsError } = await supabase
        .from('role_permissions')
        .select('*');

      if (permsError) throw permsError;

      // Map roles
      if (dbRoles && dbRoles.length > 0) {
        const formatted: CustomRole[] = dbRoles.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          code: r.name.toUpperCase().replace(/\s+/g, '_'),
          users_count: 0, // In practice fetched from joins, simulated for now
          editable: !['SUPER_ADMIN', 'SUPER ADMINISTRATOR', 'BUILT-IN'].includes(r.name.toUpperCase()),
        }));
        setRoles(formatted);

        // Map permission matrix
        const mapping: Record<string, string[]> = {};
        dbRoles.forEach((r: any) => {
          mapping[r.name.toUpperCase().replace(/\s+/g, '_')] = [];
        });

        if (dbRolePerms) {
          dbRolePerms.forEach((rp: any) => {
            // Find role code
            const roleObj = dbRoles.find((r: any) => r.id === rp.role_id);
            if (roleObj) {
              const roleCode = roleObj.name.toUpperCase().replace(/\s+/g, '_');
              if (!mapping[roleCode]) mapping[roleCode] = [];
              mapping[roleCode].push(rp.permission_id);
            }
          });
        }
        setPermissionsMap(mapping);
      } else {
        throw new Error('Database tables empty, initializing fallback.');
      }
    } catch (err) {
      // Graceful fallback to sandbox simulation
      console.warn('Supabase RBAC tables not configured. Operating in Secure Sandbox Mode.');
      setIsSandboxMode(true);
      
      // Load standard enterprise roles
      const defaultRoles: CustomRole[] = [
        { id: '1', name: 'Super Administrator', code: 'SUPER_ADMIN', description: 'Full access to all organizations, billing, and configurations', users_count: 1, editable: false },
        { id: '2', name: 'Organization Owner', code: 'ORGANIZATION_OWNER', description: 'Full control over active organization settings and subscriptions', users_count: 2, editable: true },
        { id: '3', name: 'Organization Admin', code: 'ORGANIZATION_ADMIN', description: 'Manage users, departments, and active directories in the tenant', users_count: 4, editable: true },
        { id: '4', name: 'Security Analyst', code: 'SECURITY_ANALYST', description: 'Monitor incidents, view anomalies, and perform vulnerability scans', users_count: 5, editable: true },
        { id: '5', name: 'HR Manager', code: 'HR_MANAGER', description: 'Access employee directory, manage schedules and attendance logs', users_count: 3, editable: true },
        { id: '6', name: 'Team Manager', code: 'TEAM_MANAGER', description: 'Review and approve access requests for assigned department teams', users_count: 8, editable: true },
        { id: '7', name: 'Employee', code: 'EMPLOYEE', description: 'Standard workplace access, register trusted devices, submit requests', users_count: 42, editable: false },
        { id: '8', name: 'Guest User', code: 'GUEST_USER', description: 'Temporary read-only profile access', users_count: 1, editable: true },
      ];
      setRoles(defaultRoles);
      setPermissionsMap(DEFAULT_ROLE_PERMISSIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  // 2. Filter roles based on user search query
  const filteredRoles = useMemo(() => {
    return roles.filter(role => 
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [roles, searchQuery]);

  // 3. Dynamic Matrix Toggle Permission Handler
  const togglePermission = async (roleCode: string, permissionId: string) => {
    const activeRole = roles.find(r => r.code === roleCode);
    if (!activeRole?.editable) {
      toast.error('System roles (like Super Admin/Employee) are protected and cannot be modified.');
      return;
    }

    const currentPermissions = permissionsMap[roleCode] || [];
    const isAssigned = currentPermissions.includes(permissionId);
    
    // Optimistic UI update
    const updatedPermissions = isAssigned
      ? currentPermissions.filter(id => id !== permissionId)
      : [...currentPermissions, permissionId];

    setPermissionsMap(prev => ({
      ...prev,
      [roleCode]: updatedPermissions,
    }));

    if (isSandboxMode) {
      toast.success(`Permission updated for ${activeRole.name} (Sandbox Mode)`);
      return;
    }

    // Persist to DB
    try {
      if (isAssigned) {
        // Delete permission
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', activeRole.id)
          .eq('permission_id', permissionId);
      } else {
        // Add permission
        await supabase
          .from('role_permissions')
          .insert({
            role_id: activeRole.id,
            permission_id: permissionId,
          });
      }
      toast.success(`Updated ${permissionId} on ${activeRole.name}`);
    } catch (err) {
      toast.error('Could not save permission toggle to database.');
      // Rollback UI
      setPermissionsMap(prev => ({
        ...prev,
        [roleCode]: currentPermissions,
      }));
    }
  };

  // 4. Create or Clone Role Handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name.');
      return;
    }

    const newCode = newRoleName.toUpperCase().replace(/\s+/g, '_');
    const existing = roles.find(r => r.code === newCode);
    if (existing) {
      toast.error('A role with this name or signature already exists.');
      return;
    }

    const newId = Math.random().toString(36).substring(7);
    const newRole: CustomRole = {
      id: newId,
      name: newRoleName,
      code: newCode,
      description: newRoleDesc || 'Custom workspace role.',
      users_count: 0,
      editable: true,
    };

    // Grab cloned permissions or default empty
    const clonedPermissions = cloneSourceRole ? [...(permissionsMap[cloneSourceRole] || [])] : [];

    setRoles(prev => [...prev, newRole]);
    setPermissionsMap(prev => ({
      ...prev,
      [newCode]: clonedPermissions,
    }));

    setIsCreateModalOpen(false);
    setNewRoleName('');
    setNewRoleDesc('');
    setCloneSourceRole('');

    if (isSandboxMode) {
      toast.success(`Role "${newRoleName}" successfully created in Sandbox!`);
      return;
    }

    try {
      const { data: dbRole, error: roleErr } = await supabase
        .from('roles')
        .insert({
          name: newRoleName,
          description: newRoleDesc,
        })
        .select()
        .single();

      if (roleErr) throw roleErr;

      // Add cloned permissions if loaded
      if (clonedPermissions.length > 0 && dbRole) {
        const payload = clonedPermissions.map(pId => ({
          role_id: dbRole.id,
          permission_id: pId,
        }));
        await supabase.from('role_permissions').insert(payload);
      }
      toast.success(`Role "${newRoleName}" successfully created.`);
      fetchRolesData();
    } catch (err) {
      toast.success(`Role created locally (DB sync skipped)`);
    }
  };

  // 5. Delete Role Handler
  const handleDeleteRole = async (roleId: string, roleCode: string) => {
    const roleObj = roles.find(r => r.id === roleId);
    if (!roleObj?.editable) {
      toast.error('Built-in system roles cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${roleObj.name}" role?`)) {
      return;
    }

    setRoles(prev => prev.filter(r => r.id !== roleId));
    toast.success(`Role "${roleObj.name}" removed.`);

    if (isSandboxMode) return;

    try {
      await supabase.from('roles').delete().eq('id', roleId);
    } catch (err) {
      console.error(err);
    }
  };

  // Group permissions by category for visual matrix readability
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof PERMISSIONS> = {};
    PERMISSIONS.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold mb-2">{'Roles permission'}</h1>
                {isSandboxMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-warning/20 border border-warning/30 text-warning uppercase font-bold tracking-wider animate-pulse">
                    {'Local sandbox mod'}</span>
                )}
              </div>
              <p className="text-muted-foreground">
                {'Configureroleba'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-input-background/30 border-white/10 text-sm"
                />
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} className="h-10">
                <Plus className="w-4 h-4 mr-2" />
                {'Create role'}</Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Identities roles'}</p>
                  <h3 className="text-2xl font-semibold">{roles.length} {'Roles'}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Hierarchicallyi'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Assigned active d'}</p>
                  <h3 className="text-2xl font-semibold">
                    {roles.reduce((acc, curr) => acc + curr.users_count, 0)} {'Employees'}</h3>
                  <p className="text-xs text-success mt-1">{'Statusisolation'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'System permissio'}</p>
                  <h3 className="text-2xl font-semibold">{PERMISSIONS.length} {'Permissions'}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Across'}{Object.keys(groupedPermissions).length} {'Majormodules'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Role Modal */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-[#0b0f19] border border-primary/20 backdrop-blur-md rounded-xl p-6 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> {'Create custom acc'}</h3>
                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{'Role name'}</label>
                    <Input
                      placeholder="e.g. Finance Auditor"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="bg-input-background/40 border-white/10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{'Description'}</label>
                    <Input
                      placeholder="Manage billing statements and audit logs"
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      className="bg-input-background/40 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{'Clone permission'}</label>
                    <select
                      value={cloneSourceRole}
                      onChange={(e) => setCloneSourceRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#131924] border border-white/10 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">{'Dont clone emptyp'}</option>
                      {roles.map(r => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      {'Cancel'}</Button>
                    <Button type="submit">
                      {'Create role'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Configured Roles List */}
          <Card className="mb-6 border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {'Configured direc'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-white">{role.name}</h4>
                            {!role.editable ? (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1 border border-white/5">
                                <Lock className="w-2.5 h-2.5" /> {'System built in'}</span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider border border-primary/20">
                                {'Custom'}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{role.users_count} {'Users'}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{'Assigned'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!role.editable}
                            onClick={() => {
                              setCloneSourceRole(role.code);
                              setNewRoleName(`${role.name} Copy`);
                              setNewRoleDesc(`Cloned copy of ${role.name}.`);
                              setIsCreateModalOpen(true);
                            }}
                            title="Clone Role"
                            className="w-9 h-9 p-0 flex items-center justify-center border-white/10 hover:border-primary/30"
                          >
                            <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!role.editable}
                            onClick={() => handleDeleteRole(role.id, role.code)}
                            title="Delete Role"
                            className="w-9 h-9 p-0 flex items-center justify-center border-white/10 hover:border-destructive/30"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredRoles.length === 0 && (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                      {'Nomatchingroles'}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Permissions Matrix */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{'Enterprise permi'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-muted-foreground uppercase tracking-widest">
                      <th className="text-left p-3 font-semibold w-1/4">{'Module capabilit'}</th>
                      {roles.map(role => (
                        <th key={role.code} className="text-center p-3 font-semibold min-w-[120px]">
                          <span className="block text-white text-[11px] font-bold">{role.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                      <React.Fragment key={category}>
                        <tr className="bg-primary/5 border-y border-white/5">
                          <td colSpan={roles.length + 1} className="p-3 font-bold text-xs uppercase tracking-wider text-primary">
                            {category}
                          </td>
                        </tr>
                        {perms.map(permission => (
                          <tr
                            key={permission.id}
                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="p-3">
                              <div className="font-medium text-sm text-gray-200">{permission.name}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{permission.description}</div>
                            </td>
                            {roles.map(role => {
                              const isAssigned = (permissionsMap[role.code] || []).includes(permission.id);
                              const isSystemLocked = !role.editable;
                              return (
                                <td key={role.code} className="p-3 text-center">
                                  <button
                                    onClick={() => togglePermission(role.code, permission.id)}
                                    disabled={isSystemLocked}
                                    title={isSystemLocked ? 'Built-in role permissions are locked' : `Toggle ${permission.name} for ${role.name}`}
                                    className={`mx-auto flex items-center justify-center p-1 rounded transition-colors ${
                                      isSystemLocked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'
                                    }`}
                                  >
                                    {isAssigned ? (
                                      <CheckCircle className="w-5 h-5 text-success" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
export default RolesPermissions;
