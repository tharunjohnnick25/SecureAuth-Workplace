'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { 
  Activity, 
  Smartphone, 
  Globe, 
  Clock, 
  Shield, 
  XCircle,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function SessionManagement() {
  const { data: sessions, loading, refetch } = useRealtimeData('sessions', (q) => q.select('*').order('last_active', { ascending: false }));
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const res = await fetch('/api/auth/session/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error('Failed to revoke session');
      toast.success('Session revoked successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">Session Management</h1>
              <p className="text-muted-foreground">Monitor and manage all active authentication sessions</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <h3 className="text-2xl font-semibold">{(sessions as any[]).filter((s: any) => s.is_active).length}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Secure Devices</p>
                  <h3 className="text-2xl font-semibold">{new Set((sessions as any[]).map((s: any) => s.device_id)).size}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Geographic Spread</p>
                  <h3 className="text-2xl font-semibold">{new Set((sessions as any[]).map((s: any) => s.ip_address)).size} IPs</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Authentication Contexts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                      <th className="px-4 py-3">Device / Browser</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Last Seen</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(sessions as any[]).map((session: any) => (
                      <tr key={session.id} className="group hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-input-background flex items-center justify-center">
                              <Smartphone className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{session.user_agent?.split(' ')[0] || 'Unknown Device'}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {session.user_agent}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                           <div className="flex items-center gap-2">
                             <Globe className="w-4 h-4 text-muted-foreground" />
                             <span className="text-sm font-mono">{session.ip_address}</span>
                           </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            session.is_active ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'
                          }`}>
                            {session.is_active ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {session.is_active ? (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleRevoke(session.id)}
                              disabled={revoking === session.id}
                              className="gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Revoke
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                              Terminated
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(sessions as any[]).length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          No active sessions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
