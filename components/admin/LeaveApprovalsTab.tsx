'use client';

import { useState, useEffect } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { Button } from '@/components/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from '@/store/useAuthStore';

export function LeaveApprovalsTab({ hideLayout = false }: { hideLayout?: boolean }) {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      let url = '/api/leaves';
      if (user?.id) {
        if (user.role === 'MANAGER') {
          url = `/api/leaves?manager_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
        } else {
          url = `/api/leaves?admin_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLeaves();
    }
  }, [user?.id]);

  const handleAction = async (requestId: string, action: 'Approve' | 'Reject') => {
    let newStatus = action === 'Reject' ? 'Rejected' : 'Approved';
    if (action === 'Approve' && user?.role === 'MANAGER') {
      newStatus = 'Manager Approved';
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
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    }
  };

  const columns = [
    { 
      key: 'user', 
      label: 'Employee',
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.user_name || 'System User'}</span>
          <span className="text-xs text-gray-500">{row.email ? `${row.email} • ${row.type}` : row.type}</span>
        </div>
      )
    },
    { 
      key: 'dates', 
      label: 'Dates Requested',
      render: (_: any, row: any) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-300">{row.start_date} to {row.end_date}</span>
        </div>
      )
    },
    { 
      key: 'reason', 
      label: 'Reason',
      render: (val: string) => <span className="text-gray-400 text-xs italic">"{val || 'No reason provided'}"</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: string) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          val === 'Approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          val === 'Manager Approved' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
          val === 'Rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Applied',
      render: (val: string) => val ? formatDistanceToNow(new Date(val), { addSuffix: true }) : 'N/A'
    },
    { 
      key: 'actions', 
      label: 'Management',
      render: (_: any, row: any) => {
        const canApprove = (row.status === 'Pending' && user?.role === 'MANAGER') || (row.status === 'Manager Approved' && ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || ''));

        return (
          <div className="flex gap-2">
            {canApprove && (
              <>
                <Button 
                  size="sm" 
                  className="h-8 bg-green-600 hover:bg-green-500 text-xs gap-1"
                  onClick={() => handleAction(row.id, 'Approve')}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs gap-1"
                  onClick={() => handleAction(row.id, 'Reject')}
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
      title="Leave Approvals" 
      description="Review and process employee leave applications."
      columns={columns}
      data={requests}
      hideLayout={hideLayout}
    />
  );
}
