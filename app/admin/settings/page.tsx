'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Settings, RefreshCw, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleManualSync = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/cron/sync-roles?secret=dev-secret-123');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      
      toast.success(`Sync complete. ${data.changed} roles updated via ${data.provider}.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-cyan-400" />
                System Settings
              </h1>
              <p className="text-sm text-gray-400 mt-1">Configure global application settings and integrations.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Identity Provider Settings */}
              <Card className="p-6 border-white/5 space-y-6 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                    <Link2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Identity Provider (IdP)</h2>
                    <p className="text-xs text-gray-400">Google Workspace / Azure AD Sync</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-200">Automatic Role Sync</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Periodically pull group memberships to assign RBAC roles automatically.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={syncEnabled} onChange={() => setSyncEnabled(!syncEnabled)} />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-amber-400/80 mb-3 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      Note: External IdP synchronization will overwrite local role changes.
                    </p>
                    <Button 
                      onClick={handleManualSync}
                      disabled={loading}
                      className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm"
                    >
                      {loading ? (
                         <span className="flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</span>
                      ) : (
                         <span className="flex items-center gap-2 justify-center"><RefreshCw className="w-4 h-4" /> Trigger Manual Sync</span>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
