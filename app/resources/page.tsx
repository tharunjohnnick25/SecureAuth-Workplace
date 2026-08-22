'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { 
  Database, ShieldAlert, Terminal, Code, DollarSign, Key, 
  Lock, Unlock, Clock, AlertTriangle, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import AnimateLayout from '@/components/AnimateLayout';

const CONFIDENTIAL_RESOURCES = [
  { id: 'prod-db', name: 'Production Database', icon: Database, description: 'Direct read/write access to the core production user cluster.', riskLevel: 'Critical' },
  { id: 'client-pii', name: 'Client PII Vault', icon: ShieldAlert, description: 'Decrypted access to client Personally Identifiable Information (PII).', riskLevel: 'High' },
  { id: 'server-root', name: 'Root Server SSH', icon: Terminal, description: 'Root-level SSH access to the primary infrastructure servers.', riskLevel: 'Critical' },
  { id: 'source-code', name: 'Source Code Repository', icon: Code, description: 'Full access to the company proprietary source code repositories.', riskLevel: 'Medium' },
  { id: 'financials', name: 'Financial Records', icon: DollarSign, description: 'Quarterly financial reports, analytics, and payroll backend.', riskLevel: 'High' },
  { id: 'api-keys', name: 'Master API Keys', icon: Key, description: 'Access to master integration keys (Stripe, Twilio, SendGrid).', riskLevel: 'Critical' },
];

export default function ResourcesPage() {
  const { user } = useAuthStore();
  
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [teamRequests, setTeamRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isManagerOrAdmin = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() || '');
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() || '');

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch my own requests
      const myRes = await fetch(`/api/access-requests?requester_id=${user?.id}`);
      const myData = await myRes.json();
      if (!myData.success) throw new Error(myData.error || 'Failed to fetch your requests');
      setMyRequests(myData.data || []);

      // 2. If Manager/Admin, fetch team/company requests pending their approval
      if (isManagerOrAdmin) {
        const url = `/api/access-requests`;
        const teamRes = await fetch(url);
        const teamData = await teamRes.json();
        if (teamData.success) {
           // Filter out their own requests from the team list so they don't see themselves in the approval queue
           const othersRequests = (teamData.data || []).filter((r: any) => r.requester_id !== user?.id);
           setTeamRequests(othersRequests);
        }
      }
    } catch (e: any) {
      setError('Unable to load access requests. Please try again.');
      toast.error('Unable to load access requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getResourceStatus = (resourceName: string) => {
    const relevantRequests = myRequests
      .filter(req => req.module === resourceName)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (relevantRequests.length === 0) return null;
    return (relevantRequests[0].status || '').toLowerCase(); // 'pending', 'approved', 'rejected'
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return toast.error('Justification is required.');
    
    setSubmitting(true);
    try {
      const formattedReason = `[${selectedResource.name}] - ${justification.trim()}`;
      
      // Prevent duplicates
      const existingPending = myRequests.find(r => r.status === 'pending' && r.reason === formattedReason);
      if (existingPending) {
         throw new Error('You already have a pending request for this resource and reason.');
      }

      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: selectedResource.name, reason: justification.trim() })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to submit request');
      
      toast.success(`Access request for ${selectedResource.name} submitted successfully.`);
      setIsModalOpen(false);
      setJustification('');
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    try {
       const endpoint = action === 'approve' ? 'approve' : 'reject';
       const res = await fetch(`/api/access-requests/${requestId}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action === 'reject' ? { reason: 'Admin Rejected' } : {})
       });
       const data = await res.json();
       if (!data.success) throw new Error(data.error || `Failed to ${action} request`);
       
       toast.success(`Request ${action}d successfully`);
       fetchRequests();
    } catch (e: any) {
       toast.error(e.message);
    } finally {
       setProcessingId(null);
    }
  };

  const openModal = (resource: any) => {
    setSelectedResource(resource);
    setJustification('');
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-cyber-dark)]">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1 p-6 lg:p-8 pt-24 max-w-7xl mx-auto w-full">
          <AnimateLayout>
            <div className="mb-10">
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-[var(--color-cyber-blue)]" />
                Office Confidential Resources
              </h1>
              <p className="text-gray-400 text-lg max-w-3xl">
                Secure access portal for highly restricted company assets. Access requires explicit administrative approval.
              </p>
            </div>

            {error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
                 <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                 <h2 className="text-xl font-bold text-white mb-2">{error}</h2>
                 <p className="text-gray-400 mb-6">There was a problem communicating with the secure database.</p>
                 <button onClick={fetchRequests} className="px-6 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-bold transition-colors">
                    Try Again
                 </button>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-32">
                <Loader2 className="w-12 h-12 text-[var(--color-cyber-blue)] animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {CONFIDENTIAL_RESOURCES.map((resource) => {
                    const status = getResourceStatus(resource.name);
                    
                    return (
                      <div key={resource.id} className="glass-panel p-6 relative overflow-hidden group hover:border-[var(--color-cyber-blue)]/50 transition-colors flex flex-col">
                        <div className="absolute top-4 right-4">
                          {status === 'approved' && <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyber-green)] bg-[var(--color-cyber-green)]/10 px-2 py-1 rounded border border-[var(--color-cyber-green)]/30 uppercase tracking-wider"><Unlock className="w-3 h-3"/> Granted</span>}
                          {status === 'manager_approved' && <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyber-blue)] bg-[var(--color-cyber-blue)]/10 px-2 py-1 rounded border border-[var(--color-cyber-blue)]/30 uppercase tracking-wider"><CheckCircle2 className="w-3 h-3"/> Mgr Approved</span>}
                          {status === 'pending' && <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30 uppercase tracking-wider"><Clock className="w-3 h-3"/> Pending</span>}
                          {status === 'rejected' && <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyber-red)] bg-[var(--color-cyber-red)]/10 px-2 py-1 rounded border border-[var(--color-cyber-red)]/30 uppercase tracking-wider"><Lock className="w-3 h-3"/> Rejected</span>}
                          {!status && <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-wider"><Lock className="w-3 h-3"/> Locked</span>}
                        </div>

                        <resource.icon className="w-10 h-10 text-[var(--color-cyber-blue)] mb-4" />
                        
                        <h3 className="text-xl font-bold text-white mb-2">{resource.name}</h3>
                        <p className="text-sm text-gray-400 mb-6 flex-1">{resource.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded ${
                            resource.riskLevel === 'Critical' ? 'bg-[var(--color-cyber-red)]/20 text-[var(--color-cyber-red)] border border-[var(--color-cyber-red)]/30' :
                            resource.riskLevel === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            Risk: {resource.riskLevel}
                          </span>

                          {status === 'approved' ? (
                            <button onClick={() => toast.success(`Accessing ${resource.name}...`)} className="px-4 py-2 bg-[var(--color-cyber-green)]/20 text-[var(--color-cyber-green)] hover:bg-[var(--color-cyber-green)]/30 font-bold rounded-lg text-sm transition-colors border border-[var(--color-cyber-green)]/30 shadow-[0_0_10px_rgba(0,255,102,0.2)]">
                              Access Portal
                            </button>
                          ) : status === 'pending' ? (
                            <button disabled className="px-4 py-2 bg-white/5 text-gray-400 font-bold rounded-lg text-sm cursor-not-allowed">
                              Awaiting Review
                            </button>
                          ) : (
                            <button onClick={() => openModal(resource)} className="btn-cyber px-4 py-2 text-sm">
                              Request Access
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isManagerOrAdmin && (
                  <div className="mt-12">
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                       Team Access Requests
                    </h2>
                    
                    {teamRequests.length === 0 ? (
                       <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                          <ShieldAlert className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-gray-300">No access requests</h3>
                          <p className="text-gray-500 text-sm mt-1">There are currently no pending resource requests requiring your approval.</p>
                       </div>
                    ) : (
                       <div className="bg-[#0b132b] border border-white/10 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-sm">
                             <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                                <tr>
                                   <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Requester</th>
                                   <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Resource / Reason</th>
                                   <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                                   <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                   <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Action</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                {teamRequests.map(req => (
                                   <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-4">
                                         <div className="font-bold text-white">{req.user_name}</div>
                                         <div className="text-xs text-gray-500">{req.email}</div>
                                         <div className="text-[10px] text-[var(--color-cyber-blue)] mt-1 uppercase">{req.department || 'Employee'}</div>
                                      </td>
                                      <td className="px-6 py-4 text-gray-300 max-w-xs truncate" title={req.reason}>
                                         <span className="block font-bold text-white text-xs mb-1">{req.module}</span>
                                         {req.reason}
                                      </td>
                                      <td className="px-6 py-4 text-gray-400 text-xs">
                                         {new Date(req.created_at).toLocaleDateString()}
                                      </td>
                                      <td className="px-6 py-4">
                                        {(req.status || '').toLowerCase() === 'pending' && <span className="text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Pending</span>}
                                        {(req.status || '').toLowerCase() === 'manager_approved' && <span className="text-[var(--color-cyber-blue)] bg-[var(--color-cyber-blue)]/10 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Mgr Approved</span>}
                                        {(req.status || '').toLowerCase() === 'approved' && <span className="text-[var(--color-cyber-green)] bg-[var(--color-cyber-green)]/10 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Approved</span>}
                                        {(req.status || '').toLowerCase() === 'rejected' && <span className="text-[var(--color-cyber-red)] bg-[var(--color-cyber-red)]/10 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Rejected</span>}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                         {((req.status || '').toLowerCase() === 'pending' || ((req.status || '').toLowerCase() === 'manager_approved' && isAdmin)) ? (
                                            <div className="flex items-center justify-end gap-2">
                                               <button onClick={() => handleApproveReject(req.id, 'approve')} disabled={processingId === req.id} className="p-2 bg-[var(--color-cyber-green)]/20 text-[var(--color-cyber-green)] hover:bg-[var(--color-cyber-green)]/30 rounded-lg transition-colors">
                                                  {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                                               </button>
                                               <button onClick={() => handleApproveReject(req.id, 'reject')} disabled={processingId === req.id} className="p-2 bg-[var(--color-cyber-red)]/20 text-[var(--color-cyber-red)] hover:bg-[var(--color-cyber-red)]/30 rounded-lg transition-colors">
                                                  {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4"/>}
                                               </button>
                                            </div>
                                         ) : (
                                            <span className="text-xs text-gray-500">Processed</span>
                                         )}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    )}
                  </div>
                )}
              </>
            )}
          </AnimateLayout>
        </main>
      </div>

      {/* Request Access Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0f1c] border border-[var(--color-cyber-blue)]/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(0,240,255,0.1)] relative">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[var(--color-cyber-blue)]/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-[var(--color-cyber-blue)]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Request Resource Access</h3>
                <p className="text-sm text-[var(--color-cyber-blue)]">{selectedResource?.name}</p>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-6">
              <p className="text-xs text-orange-200">
                <strong>Warning:</strong> You are requesting access to a <span className="uppercase font-bold">{selectedResource?.riskLevel}</span> risk asset. All activity will be logged and audited.
              </p>
            </div>

            <form onSubmit={handleRequestAccess}>
              <div className="space-y-2 mb-6">
                <label className="text-sm font-semibold text-gray-300">Business Justification</label>
                <textarea 
                  required
                  rows={4}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain exactly why you need access to this resource for your current tasks..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:bg-black/60 focus:border-[var(--color-cyber-blue)] focus:ring-1 focus:ring-[var(--color-cyber-blue)]/50 transition-all outline-none resize-none"
                />
              </div>

              <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-sm">
                <span className="text-gray-400">Approval routing to:</span>
                <span className="font-semibold text-white bg-white/10 px-2 py-1 rounded">
                  {user?.role?.toUpperCase() === 'MANAGER' ? 'Admin / Security' : (user?.manager_name || 'Manager')}
                </span>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-cyber px-5 py-2.5 flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin"/>} Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
