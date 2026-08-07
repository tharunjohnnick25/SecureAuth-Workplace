'use client';

import { useState, useEffect } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { Button } from '@/components/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from "@/context/LanguageContext";

export default function AdminLeavesPage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leaves');
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
    fetchLeaves();
  }, []);

  const handleAction = async (requestId: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/leaves/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully`);
        fetchLeaves();
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
          <span className="font-medium text-white">{row.user_name || 'System User'}</span>
          <span className="text-xs text-gray-500">{row.type}</span>
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
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          {row.status === 'Pending' && (
            <>
              <Button 
                size="sm" 
                className="h-8 bg-green-600 hover:bg-green-500 text-xs gap-1"
                onClick={() => handleAction(row.id, 'Approved')}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs gap-1"
                onClick={() => handleAction(row.id, 'Rejected')}
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <DataGridPage 
      title="Leave Approvals" 
      description="Review and process employee leave applications."
      columns={columns}
      data={requests}
    />
  );
}
