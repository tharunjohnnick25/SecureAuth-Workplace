'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

type LeaveRequest = {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string;
  admin_remarks: string | null;
  created_at: string;
};

export default function AdminLeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedReq, setSelectedReq] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionStatus, setActionStatus] = useState<'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/leave');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    const lower = search.toLowerCase();
    return requests.filter(r =>
      r.user_id.toLowerCase().includes(lower) ||
      r.status.toLowerCase().includes(lower) ||
      r.leave_type.toLowerCase().includes(lower)
    );
  }, [search, requests]);

  const handleAction = async () => {
    if (!selectedReq || !actionStatus) return;

    try {
      const res = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_id: selectedReq.id,
          status: actionStatus,
          admin_remarks: remarks
        })
      });

      if (res.ok) {
        toast.success(`Request marked as ${actionStatus}`);
        setIsDialogOpen(false);
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update request');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const openActionDialog = (req: LeaveRequest, status: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED') => {
    setSelectedReq(req);
    setActionStatus(status);
    setRemarks('');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'info_requested':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Info Requested</Badge>;
      case 'manager_approved':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Manager Approved</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const isEmployee = (role?: string) => {
    const r = (role || '').toLowerCase();
    return r === '' || r === 'employee';
  };

  // Admin may final-approve MANAGER_APPROVED employee leaves, or any PENDING
  // leave from a manager-level user. Employee PENDING leaves must first be
  // approved by the manager.
  const canFinalApprove = (status: string, role?: string) => {
    const s = (status || '').toLowerCase();
    return s === 'manager_approved' || (s === 'pending' && !isEmployee(role));
  };

  // Reject / Info-request may be actioned while PENDING or MANAGER_APPROVED.
  const canRejectOrInfo = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'manager_approved';
  };

  const isProcessed = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'approved' || s === 'rejected' || s === 'info_requested';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Leave Management</h1>
          <p className="text-slate-400">Review and manage employee leave requests.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <Input
              placeholder="Search by ID or Status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-700"
            />
          </div>
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-300">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee / ID</th>
                  <th className="px-6 py-4 font-medium">Leave Details</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading requests...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No leave requests found.</td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{req.user_name || 'Employee'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1" title={req.user_id}>
                          {req.user_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-blue-400">{req.leave_type}</div>
                        <div className="text-slate-400 mt-1 line-clamp-1 max-w-[200px]" title={req.reason}>
                          {req.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">
                          {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-1">{req.total_days ?? '—'} day(s)</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {!isProcessed(req.status) ? (
                          <>
                            {canFinalApprove(req.status, req.user_role) && (
                              <Button size="sm" onClick={() => openActionDialog(req, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                            )}
                            {canRejectOrInfo(req.status) && (
                              <>
                                <Button size="sm" variant="destructive" onClick={() => openActionDialog(req, 'REJECTED')}>Reject</Button>
                                <Button size="sm" variant="outline" onClick={() => openActionDialog(req, 'INFO_REQUESTED')} className="border-slate-700 hover:bg-slate-800 text-slate-300">Info</Button>
                              </>
                            )}
                            {isEmployee(req.user_role) && (req.status || '').toLowerCase() === 'pending' && (
                              <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">Awaiting Manager</span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              Confirm Action: <span className={actionStatus === 'APPROVED' ? 'text-emerald-500' : actionStatus === 'REJECTED' ? 'text-red-500' : 'text-amber-500'}>{actionStatus}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              You are about to mark this leave request as {actionStatus?.toLowerCase()}. Please provide any remarks (optional, sent to employee).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="remarks" className="text-slate-300">Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Please provide a medical certificate..."
              className="bg-slate-950 border-slate-700 mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button
              onClick={handleAction}
              className={
                actionStatus === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                actionStatus === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-amber-600 hover:bg-amber-700 text-white'
              }
            >
              Confirm {actionStatus}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
