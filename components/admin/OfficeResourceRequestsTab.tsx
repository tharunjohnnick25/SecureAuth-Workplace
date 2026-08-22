'use client';

import { useState, useEffect } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { Button } from '@/components/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/useAuthStore';

export function OfficeResourceRequestsTab({ hideLayout = false }: { hideLayout?: boolean }) {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = user?.role === 'MANAGER';

  const fetchRequests = async () => {
    try {
      if (!user?.id) return;
      const query = isManager ? `?manager_id=${user.id}` : '';
      const res = await fetch(`/api/resources/requests${query}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch resource requests');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user?.id, isManager]);

  const handleAction = async (requestId: string, status: 'manager_approved' | 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/resources/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request marked as ${status.replace('_', ' ')}`);
        fetchRequests();
      } else {
        toast.error(data.error || `Failed to update request`);
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    }
  };

  const normalizeStatus = (s: string) => {
    const v = (s || '').toLowerCase();
    if (v === 'approved') return 'Approved';
    if (v === 'rejected') return 'Rejected';
    if (v === 'manager_approved') return 'Manager Approved';
    return 'Pending';
  };

  const columns = [
    {
      key: 'user',
      label: 'Employee',
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.user_name || 'System User'}</span>
          <span className="text-xs text-gray-500">{row.email}</span>
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Resource / Justification',
      render: (val: string) => <span className="text-gray-400 text-xs italic">"{val || 'No reason provided'}"</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: any) => {
        const display = normalizeStatus(row.status);
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            display === 'Approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            display === 'Manager Approved' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            display === 'Rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
          }`}>
            {display}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Requested',
      render: (val: string, row: any) => row.created_at ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true }) : 'N/A'
    },
    {
      key: 'actions',
      label: 'Management',
      render: (_: any, row: any) => {
        const st = (row.status || '').toLowerCase();
        const canAction = isManager
          ? st === 'pending'
          : st === 'manager_approved' || st === 'pending';

        return (
          <div className="flex gap-2">
            {canAction && (
              <>
                <Button
                  size="sm"
                  className="h-8 bg-green-600 hover:bg-green-500 text-xs gap-1"
                  onClick={() => handleAction(row.id, isManager ? 'manager_approved' : 'approved')}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs gap-1"
                  onClick={() => handleAction(row.id, 'rejected')}
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <DataGridPage
      title="Office Resource Requests"
      description={isManager ? 'Pre-approve confidential resource access requests from your direct reports.' : 'Finalize confidential resource access requests after manager pre-approval.'}
      columns={columns}
      data={requests}
      loading={loading}
      hideLayout={hideLayout}
    />
  );
}
