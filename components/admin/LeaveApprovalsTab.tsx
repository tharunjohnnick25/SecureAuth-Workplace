'use client';

import { useState, useEffect } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { Button } from '@/components/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/useAuthStore';

interface LeaveRequestRow {
  id: string;
  user_id: string;
  user_name?: string;
  email?: string;
  type?: string;
  leave_type?: string;
  user_role?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  status?: string;
  created_at?: string;
  admin_remarks?: string | null;
}

export function LeaveApprovalsTab({ hideLayout = false }: { hideLayout?: boolean }) {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const isManagerUser = (user?.role || '').toUpperCase() === 'MANAGER';
    const load = async () => {
      try {
        let url = '/api/leaves';
        if (isManagerUser) {
          url = `/api/leaves?manager_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
        } else {
          url = `/api/leaves?admin_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && !cancelled) {
          setRequests(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, user?.company_name]);

  const fetchLeaves = async () => {
    if (!user?.id) return;
    try {
      const isManagerUser = (user?.role || '').toUpperCase() === 'MANAGER';
      let url = '/api/leaves';
      if (isManagerUser) {
        url = `/api/leaves?manager_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
      } else {
        url = `/api/leaves?admin_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const normalizeStatus = (s: string) => {
    const v = (s || '').toUpperCase();
    if (v === 'APPROVED') return 'Approved';
    if (v === 'REJECTED') return 'Rejected';
    if (v === 'MANAGER_APPROVED') return 'Manager Approved';
    if (v === 'INFO_REQUESTED') return 'Info Requested';
    return 'Pending';
  };

  const handleAction = async (requestId: string, action: 'Approve' | 'Reject') => {
    const isManagerUser = (user?.role || '').toUpperCase() === 'MANAGER';
    let newStatus = action === 'Reject' ? 'Rejected' : 'Approved';
    if (action === 'Approve' && isManagerUser) {
      newStatus = 'MANAGER_APPROVED';
    }

    try {
      const res = await fetch(`/api/leaves/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Leave request ${action.toLowerCase()}d successfully`);
        fetchLeaves();
      } else {
        toast.error(data.error || `Failed to process request`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Employee',
      render: (_: string, row: LeaveRequestRow) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.user_name || 'System User'}</span>
          <span className="text-xs text-gray-500">{row.email ? `${row.email} • ${row.type}` : row.type}</span>
        </div>
      )
    },
    {
      key: 'dates',
      label: 'Dates Requested',
      render: (_: string, row: LeaveRequestRow) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-300">{row.start_date} to {row.end_date}</span>
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (val: string) => <span className="text-gray-400 text-xs italic">&quot;{val || 'No reason provided'}&quot;</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string, row: LeaveRequestRow) => {
        const display = normalizeStatus(row.status || val);
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
      label: 'Applied',
      render: (val: string) => val ? formatDistanceToNow(new Date(val), { addSuffix: true }) : 'N/A'
    },
    {
      key: 'actions',
      label: 'Management',
      render: (_: string, row: LeaveRequestRow) => {
        const st = (row.status || '').toUpperCase();
        const role = (user?.role || '').toUpperCase();
        const reqRole = (row.user_role || '').toLowerCase();

        // Mirror the server-side rules: managers act on PENDING direct-report
        // leaves; admins final-approve MANAGER_APPROVED employee leaves or
        // PENDING manager-level leaves; rejections are allowed on PENDING.
        const canApprove =
          (st === 'PENDING' && role === 'MANAGER') ||
          (st === 'PENDING' && ['ADMIN', 'SUPER_ADMIN'].includes(role) && reqRole !== 'employee') ||
          (st === 'MANAGER_APPROVED' && ['ADMIN', 'SUPER_ADMIN'].includes(role));
        const canReject =
          (role === 'MANAGER' && st === 'PENDING') ||
          (['ADMIN', 'SUPER_ADMIN'].includes(role) && (st === 'PENDING' || st === 'MANAGER_APPROVED'));

        return (
          <div className="flex gap-2">
            {canApprove && (
              <Button
                size="sm"
                className="h-8 bg-green-600 hover:bg-green-500 text-xs gap-1"
                onClick={() => handleAction(row.id, 'Approve')}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
            )}
            {canReject && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs gap-1"
                onClick={() => handleAction(row.id, 'Reject')}
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <DataGridPage
      title="Leave Approvals"
      description="Review and process employee leave applications."
      columns={columns}
      data={requests}
      loading={loading}
      hideLayout={hideLayout}
    />
  );
}
