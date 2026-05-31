'use client';

import { useMemo, Suspense, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Shield,
  Smartphone,
  MapPin,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  Activity,
  Loader2,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { formatDistanceToNow } from 'date-fns';
import { DashboardHeader } from '@/components/DashboardHeader';
import { supabase } from '@/lib/supabase/client';

const DashboardCharts = dynamic(() => import('@/components/dashboard/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="lg:col-span-2 h-[420px] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
      <div className="h-[420px] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
    </div>
  ),
});

export function Dashboard() {
  const [userCount, setUserCount] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<number>(0);

  const { data: dbLogins, loading: loginsLoading } = useRealtimeData('login_logs', (q) =>
    q.select('*').order('created_at', { ascending: false }).limit(50)
  );
  const { data: dbAlerts, loading: alertsLoading } = useRealtimeData('threat_logs', (q) =>
    q.select('*').order('created_at', { ascending: false }).limit(10)
  );

  useEffect(() => {
    const fetchStats = async () => {
      const { count: uCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (uCount !== null) setUserCount(uCount);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: sCount } = await supabase
        .from('login_logs')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', oneDayAgo);
      if (sCount !== null) setActiveSessions(sCount);
    };
    fetchStats();
  }, []);

  const logins = useMemo(() => {
    if (!dbLogins || !Array.isArray(dbLogins) || dbLogins.length === 0) return [];
    return dbLogins.slice(0, 20);
  }, [dbLogins]);

  const alerts = useMemo(() => {
    if (!dbAlerts || !Array.isArray(dbAlerts) || dbAlerts.length === 0) return [];
    return dbAlerts;
  }, [dbAlerts]);

  const activeAlerts = useMemo(
    () => alerts.filter((a: any) => !a.is_read).length,
    [alerts]
  );
  const highRiskAlerts = useMemo(
    () => alerts.filter((a: any) => a.severity === 'CRITICAL' || a.severity === 'HIGH').length,
    [alerts]
  );

  const riskLevel = useMemo(() => {
    if (highRiskAlerts > 5) return { label: 'Critical', color: 'text-destructive' };
    if (highRiskAlerts > 2) return { label: 'Medium', color: 'text-warning' };
    return { label: 'Low', color: 'text-success' };
  }, [highRiskAlerts]);

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: days[d.getDay()], success: 0, failed: 0 };
    });

    if (Array.isArray(dbLogins)) {
      dbLogins.forEach((log: any) => {
        const logDate = new Date(log.created_at);
        const dayName = days[logDate.getDay()];
        const dayData = last7Days.find(d => d.day === dayName);
        if (dayData) {
          if (log.status === 'SUCCESS' || log.status === 'success') dayData.success++;
          else dayData.failed++;
        }
      });
    }

    return last7Days;
  }, [dbLogins]);

  const riskDistribution = useMemo(() => {
    const low = dbLogins?.filter((l: any) => (l.risk_score || 0) < 30).length || 1;
    const medium = dbLogins?.filter((l: any) => (l.risk_score || 0) >= 30 && (l.risk_score || 0) < 70).length || 0;
    const high = dbLogins?.filter((l: any) => (l.risk_score || 0) >= 70).length || 0;

    return [
      { name: 'Low Risk', value: low, color: '#10b981' },
      { name: 'Medium Risk', value: medium, color: '#f59e0b' },
      { name: 'High Risk', value: high, color: '#ef4444' },
    ];
  }, [dbLogins]);

  const isLoading = loginsLoading || alertsLoading;

  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <DashboardHeader
            title="Security Dashboard"
            description="Real-time enterprise-grade IAM monitoring"
          >
            <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">System Live</span>
            </div>
          </DashboardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <h3 className="text-2xl font-semibold">{userCount.toLocaleString()}</h3>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    Registered users
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <h3 className="text-2xl font-semibold">{activeSessions}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Alerts</p>
                  <h3 className="text-2xl font-semibold">{activeAlerts}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Requiring review</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Risk</p>
                  <h3 className={`text-2xl font-semibold ${riskLevel.color}`}>{riskLevel.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Automated evaluation</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DashboardCharts chartData={chartData} riskDistribution={riskDistribution} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Real-time Authentication Stream</CardTitle>
              <div className="text-xs text-muted-foreground">Showing last 20 events</div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : logins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No authentication events yet. Events will appear here in real-time.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                        <th className="px-4 py-3">Event</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logins.map((log: any) => (
                        <tr key={log.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                log.status === 'SUCCESS' || log.status === 'success' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                              }`}>
                                {log.status === 'SUCCESS' || log.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              </div>
                              <span className="text-sm font-medium">
                                {log.status === 'SUCCESS' || log.status === 'success' ? 'Authorized Session' : 'Blocked Attempt'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-muted-foreground">
                            {log.user_id?.substring(0, 8)}...
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                {log.city || log.location?.city || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">{log.ip_address}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-xs px-2 py-1 rounded ${
                              log.status === 'SUCCESS' || log.status === 'success'
                                ? 'bg-success/20 text-success'
                                : 'bg-destructive/20 text-destructive'
                            }`}>
                              {log.status === 'SUCCESS' || log.status === 'success' ? 'Success' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-xs text-muted-foreground">
                              {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
