'use client';

import { useEffect, useState } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { exportAuditLogsToPPT } from '@/lib/utils/exportPPT';



export function AuditLogsTab({ hideLayout }: { hideLayout?: boolean }) {
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
          setLogs([]);
        }
      } catch {
        setLogs([]);
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
      hideLayout={hideLayout}
      hideSearch={hideLayout}
    />
  );
}
