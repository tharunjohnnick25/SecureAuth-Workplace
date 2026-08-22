'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type LeaveRequest = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANAGER_APPROVED' | 'INFO_REQUESTED';
  reason: string;
  admin_remarks: string | null;
  created_at: string;
};

export default function LeaveHistoryPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/leave');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/leave');
        const data = await res.json();
        if (res.ok && !cancelled) {
          setRequests(data.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      const res = await fetch('/api/leave/cancel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leave_id: id })
      });
      if (res.ok) {
        toast.success('Request cancelled');
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to cancel request');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'MANAGER_APPROVED':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Manager Approved</Badge>;
      case 'INFO_REQUESTED':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Info Requested</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Leave History</CardTitle>
          <CardDescription className="text-slate-400">View the status of your past and current leave requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-8 text-slate-500">Loading your requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-slate-800 rounded-lg">
              <p className="text-slate-400 mb-4">You have not submitted any leave requests yet.</p>
              <Button onClick={() => router.push('/dashboard/leave/request')} className="bg-blue-600 hover:bg-blue-700">
                Request Leave
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="p-5 border border-slate-800 rounded-xl bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-slate-200">{req.leave_type}</h3>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-sm text-slate-400">
                      {format(new Date(req.start_date), 'MMM d, yyyy')} - {format(new Date(req.end_date), 'MMM d, yyyy')} • <span className="text-blue-400 font-medium">{req.total_days} day(s)</span>
                    </p>
                    {req.admin_remarks && (
                      <div className="mt-2 text-sm bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-300">
                        <span className="font-medium text-slate-500 text-xs uppercase tracking-wider block mb-1">HR Remarks</span>
                        {req.admin_remarks}
                      </div>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelRequest(req.id)}
                      className="w-full md:w-auto"
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
