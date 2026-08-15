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

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase.from('roles').select('*');
        if (!error && data && data.length > 0) {
          setRoles(data.map((r: any) => ({
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
    fetchRoles();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <DataGridPage 
      title="Roles & Permissions" 
      description="Configure granular RBAC controls for the organization."
      columns={[
        { key: 'name', label: 'Role Name' },
        { key: 'description', label: 'Description' },
        { key: 'created', label: 'Created At' }
      ]}
      data={roles}
      primaryAction={{ label: 'Create Role', onClick: () => console.log('Create role') }}
      hideLayout={hideLayout}
      hideSearch={hideLayout}
    />
  );
}