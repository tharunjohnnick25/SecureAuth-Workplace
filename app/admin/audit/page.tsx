'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ClipboardList, Download, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { AuditLogsTab } from '@/components/system-management/AuditLogsTab';


interface AuditLog {
  id: string;
  user?: { id: string; email: string; full_name?: string };
  changer?: { id: string; email: string; full_name?: string };
  old_role: string;
  new_role: string;
  reason: string;
  timestamp: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.set('endDate', end.toISOString());
      }

      const res = await fetch(`/api/v1/audit/role-changes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, startDate, endDate]);

  const handleExport = () => {
    if (logs.length === 0) return toast.info('No data to export');
    
    const headers = ['Timestamp', 'Target User', 'Old Role', 'New Role', 'Changed By', 'Reason'];
    const csvContent = [
      headers.join(','),
      ...logs.map(l => [
        new Date(l.timestamp).toISOString(),
        l.user?.email || 'Unknown',
        l.old_role,
        l.new_role,
        l.changer?.email || 'Unknown',
        `"${(l.reason || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `role_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-cyan-400" />
              Enterprise Audit Logs
            </h1>
            <p className="text-sm text-gray-400 mt-1">Immutable record of all RBAC assignments and system events.</p>
          </div>
          <Button onClick={handleExport} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        <Card className="p-0 border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 items-center bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input 
                type="date" 
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none text-gray-300"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-gray-500 text-sm">to</span>
              <input 
                type="date" 
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none text-gray-300"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 bg-white/[0.02] uppercase border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Change</th>
                  <th className="px-6 py-4 font-medium">Changed By</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No role changes found.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {log.user?.email || 'Deleted User'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 line-through text-xs uppercase">{log.old_role}</span>
                          <span className="text-cyan-400 font-semibold text-xs uppercase">→ {log.new_role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {log.changer?.email || 'System'}
                      </td>
                      <td className="px-6 py-4 text-gray-400 italic max-w-xs truncate">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="pt-8 border-t border-white/10">
          <AuditLogsTab hideLayout={true} />
        </div>

      </div>
        </main>
      </div>
    </div>
  );
}