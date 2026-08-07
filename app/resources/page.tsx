'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Database, ShieldAlert, Terminal, Code, DollarSign, Key, 
  Lock, Unlock, Clock, AlertTriangle, Loader2
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
  const supabase = createClient();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/resources/requests?user_id=${user?.id || 'mock'}`);
      const data = await res.json();
        
      if (!data.success) throw new Error('Failed to fetch');
      setRequests(data.data || []);
    } catch (e: any) {
      toast.error('Failed to load access statuses');
    } finally {
      setLoading(false);
    }
  };

  const getResourceStatus = (resourceName: string) => {
    // Look for the most recent request for this specific resource.
    // The reason string format is: "[ResourceName] - Justification"
    const relevantRequests = requests
      .filter(req => req.reason.startsWith(`[${resourceName}]`))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (relevantRequests.length === 0) return null;
    return relevantRequests[0].status; // 'pending', 'approved', 'rejected'
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return toast.error('Justification is required.');
    
    setSubmitting(true);
    try {
      const formattedReason = `[${selectedResource.name}] - ${justification.trim()}`;
      
      const res = await fetch('/api/resources/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 'mock',
          email: user?.email || '',
          user_name: user?.full_name || '',
          reason: formattedReason,
          status: 'pending'
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error('Failed to submit request');
      
      toast.success(`Access request for ${selectedResource.name} submitted successfully.`);
      setIsModalOpen(false);
      setJustification('');
      fetchRequests(); // Refresh statuses
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
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

            {loading ? (
              <div className="flex justify-center items-center py-32">
                <Loader2 className="w-12 h-12 text-[var(--color-cyber-blue)] animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CONFIDENTIAL_RESOURCES.map((resource) => {
                  const status = getResourceStatus(resource.name);
                  
                  return (
                    <div key={resource.id} className="glass-panel p-6 relative overflow-hidden group hover:border-[var(--color-cyber-blue)]/50 transition-colors">
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        {status === 'approved' && <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyber-green)] bg-[var(--color-cyber-green)]/10 px-2 py-1 rounded border border-[var(--color-cyber-green)]/30 uppercase tracking-wider"><Unlock className="w-3 h-3"/> Granted</span>}
                        {status === 'pending' && <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30 uppercase tracking-wider"><Clock className="w-3 h-3"/> Pending</span>}
                        {status === 'rejected' && <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyber-red)] bg-[var(--color-cyber-red)]/10 px-2 py-1 rounded border border-[var(--color-cyber-red)]/30 uppercase tracking-wider"><Lock className="w-3 h-3"/> Rejected</span>}
                        {!status && <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-wider"><Lock className="w-3 h-3"/> Locked</span>}
                      </div>

                      <resource.icon className="w-10 h-10 text-[var(--color-cyber-blue)] mb-4" />
                      
                      <h3 className="text-xl font-bold text-white mb-2">{resource.name}</h3>
                      <p className="text-sm text-gray-400 mb-6 min-h-[40px]">{resource.description}</p>
                      
                      <div className="flex items-center justify-between mt-auto">
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
