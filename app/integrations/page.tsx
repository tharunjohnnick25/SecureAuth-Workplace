'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { DashboardService } from '@/lib/services/dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Server, X, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Webhook');
  const [targetUrl, setTargetUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await DashboardService.getIntegrations();
      setIntegrations(data);
    } catch (e: any) {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleOpenModal = () => {
    setName('');
    setType('Webhook');
    setTargetUrl('');
    setSecretKey('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Integration name is required');
      return;
    }

    setSubmitting(true);
    try {
      await DashboardService.createIntegration({
        name: name.trim(),
        type,
        target_url: targetUrl.trim(),
        secret_key: secretKey.trim()
      });
      toast.success('Integration created successfully');
      setIsModalOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Integration Name' },
    { 
      key: 'type', 
      label: 'Type',
      render: (val: string) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {val}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: string) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          val === 'Active' 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: 'last_sync', 
      label: 'Last Sync',
      render: (val: string) => val ? formatDistanceToNow(new Date(val), { addSuffix: true }) : 'Never'
    }
  ];

  return (
    <>
      <DataGridPage 
        title="API Integrations" 
        description="Manage API endpoints, Webhooks, SIEM log forwarders, and third-party app connections."
        columns={columns}
        data={integrations}
        loading={loading}
        onRefresh={fetchIntegrations}
        primaryAction={{ label: 'New Integration', icon: Plus, onClick: handleOpenModal }}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={handleCloseModal} 
                disabled={submitting}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">New Integration</h3>
                  <p className="text-xs text-gray-400">Connect a third-party service</p>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Integration Name <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    autoFocus 
                    placeholder="e.g. Datadog SIEM"
                    value={name} 
                    onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Integration Type
                  </label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 [&>option]:text-black"
                  >
                    <option value="Webhook">Webhook</option>
                    <option value="Identity">Identity Provider (SSO)</option>
                    <option value="Log Forwarding">Log Forwarding (SIEM)</option>
                    <option value="Directory">Directory Sync (HRIS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Target URL
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://api.example.com/v1/ingest"
                    value={targetUrl} 
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Secret Key / Token (Optional)
                  </label>
                  <input 
                    type="password" 
                    placeholder="sk_live_..."
                    value={secretKey} 
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting || !name.trim()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                    ) : (
                      <><Save className="w-4 h-4" /><span>Create Integration</span></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}