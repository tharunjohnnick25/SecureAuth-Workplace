'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { Button } from '@/components/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from '@/store/useAuthStore';

export function AccessRequestsTab({ hideLayout = false }: { hideLayout?: boolean }) {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      let url = '/api/resources/requests';
      if (user?.id) {
        if (user.role === 'MANAGER') {
          // Managers should not be approving office resources, only Admins.
          setRequests([]);
          setLoading(false);
          return;
        } else {
          url = `/api/resources/requests?admin_id=${user.id}&company_name=${encodeURIComponent(user.company_name || '')}`;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRequests((data.data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [fetchRequests, user?.id]);

  const handleAction = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/resources/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status.toLowerCase() })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Request ${status.toLowerCase()} successfully`);
        fetchRequests();
      } else {
        toast.error(data.error || `Failed to ${status.toLowerCase()} request`);
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
          <span className="font-medium text-white">{row.user_name || row.users?.full_name || 'System User'}</span>
          <span className="text-xs text-gray-500">{row.email || row.users?.email || ''}</span>
        </div>
      )
    },
    { 
      key: 'reason', 
      label: 'Justification',
      render: (val: string) => <span className="text-gray-400 text-xs italic">"{val || 'No reason provided'}"</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: string) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          val === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          val === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Requested',
      render: (val: string) => val ? formatDistanceToNow(new Date(val), { addSuffix: true }) : 'N/A'
    },
    { 
      key: 'actions', 
      label: 'Management',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <>
              <Button 
                size="sm" 
                className="h-8 bg-green-600 hover:bg-green-500 text-xs gap-1"
                onClick={() => handleAction(row.id, 'APPROVED')}
              >
                <CheckCircle className="w-3.5 h-3.5" /> {'Approve'}</Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs gap-1"
                onClick={() => handleAction(row.id, 'REJECTED')}
              >
                <XCircle className="w-3.5 h-3.5" /> {'Reject'}</Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <DataGridPage 
      title="Access Requests" 
      description="Review and process employee access token requests for sensitive portals."
      columns={columns}
      data={requests}
      loading={loading}
      hideLayout={hideLayout}
    />
  );
}
