'use client';

import { useEffect, useState } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function RolesPermissionsTab({ hideLayout }: { hideLayout?: boolean }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const FALLBACK_ROLES = [
    { name: 'Admin', description: 'Full access to all system features and settings.', created: '2026-01-15' },
    { name: 'Security Admin', description: 'Access to security controls, threat intelligence, and audit logs.', created: '2026-02-20' },
    { name: 'HR Manager', description: 'Access to employee directory, attendance, and leave management.', created: '2026-03-10' },
    { name: 'Developer', description: 'Access to API integrations, compiler, and internal tools.', created: '2026-04-05' },
    { name: 'Employee', description: 'Standard access to personal dashboard, workspace, and chat.', created: '2026-01-15' }
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const json = await res.json();
      if (res.ok && json.success && json.data && json.data.length > 0) {
        setRoles(json.data.map((r: any) => ({
          name: r.name,
          description: r.description || 'N/A',
          created: new Date(r.created_at).toLocaleDateString()
        })));
      } else {
        setRoles(FALLBACK_ROLES);
      }
    } catch (err) {
      setRoles(FALLBACK_ROLES);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create role');
      setIsModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      fetchRoles();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <DataGridPage 
        title="Roles & Permissions" 
        description="Configure granular RBAC controls for the organization."
        columns={[
          { key: 'name', label: 'Role Name' },
          { key: 'description', label: 'Description' },
          { key: 'created', label: 'Created At' }
        ]}
        data={roles}
        primaryAction={{ label: 'Create Role', onClick: () => setIsModalOpen(true) }}
        hideLayout={hideLayout}
        hideSearch={hideLayout}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f111a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white">Create New Role</h3>
              <p className="text-sm text-gray-400 mt-1">Define a new role and its basic description.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. Finance Manager"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                  placeholder="Briefly describe the responsibilities of this role..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creating || !newRoleName}
                className="flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}