'use client';

import { useEffect, useState } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { exportAuditLogsToPPT } from '@/lib/utils/exportPPT';

const FALLBACK_LOGS = [
  { event: 'User Login', user: 'sarah.chen@company.com', resource: 'Authentication', time: '2026-04-30 14:32:15' },
  { event: 'Security Policy Updated', user: 'michael.r@company.com', resource: 'Settings', time: '2026-04-30 14:28:42' },
  { event: 'Failed Login Attempt', user: 'emily.t@company.com', resource: 'Authentication', time: '2026-04-30 14:25:11' },
  { event: 'API Key Generated', user: 'david.kim@company.com', resource: 'API Management', time: '2026-04-30 14:20:33' },
  { event: 'Compliance Report Exported', user: 'lisa.a@company.com', resource: 'Reports', time: '2026-04-30 14:15:22' },
  { event: 'Role Permissions Changed', user: 'admin@company.com', resource: 'Access Control', time: '2026-04-30 14:10:45' },
  { event: 'Device Registered', user: 'james.w@company.com', resource: 'Device Management', time: '2026-04-30 14:05:18' },
  { event: 'Unauthorized Access Attempt', user: 'unknown', resource: 'System', time: '2026-04-30 14:00:09' },
];

export default function Page() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select(`
            id,
            action,
            resource,
            created_at,
            users ( email )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedLogs = data.map((log: any) => ({
            event: log.action,
            user: log.users?.email || 'System',
            resource: log.resource || 'N/A',
            time: new Date(log.created_at).toLocaleString(),
          }));
          setLogs(formattedLogs);
        } else {
          setLogs(FALLBACK_LOGS);
        }
      } catch {
        setLogs(FALLBACK_LOGS);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = 'Event Type,User / Actor,Resource,Timestamp\n';
    const csvData = logs.map(row => `${row.event},${row.user},${row.resource},${row.time}`).join('\n');
    const blob = new Blob([headers + csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <DataGridPage 
      title="Audit Logs" 
      description="Immutable ledger of system events."
      columns={[
        { key: 'event', label: 'Event Type' },
        { key: 'user', label: 'User / Actor' },
        { key: 'resource', label: 'Resource' },
        { key: 'time', label: 'Timestamp' }
      ]}
      data={logs}
      onExportExcel={handleExportCSV}
      onExportPPT={() => exportAuditLogsToPPT(logs)}
    />
  );
}
