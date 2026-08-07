'use client';

import { MetricsDashboard } from '@/components/pages/MetricsDashboard';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Activity
} from 'lucide-react';
import { useMemo } from 'react';

const FALLBACK_LOGS = Array.from({ length: 20 }).map((_, i) => {
  const ips = ['192.168.1.105', '203.0.113.45', '10.0.2.15', '172.16.31.8', '45.33.32.156'];
  return {
    id: `fallback-log-${i}`,
    status: i % 5 === 0 ? 'FAILURE' : 'SUCCESS',
    ip_address: ips[i % ips.length],
    user_id: `user-${(i % 6) + 1}`,
    created_at: new Date(Date.now() - i * 18 * 60 * 1000).toISOString(),
  };
});

const FALLBACK_THREAT_ALERTS = Array.from({ length: 6 }).map((_, i) => ({
  id: `fallback-threat-${i}`,
  status: i < 2 ? 'OPEN' : 'CLOSED',
  created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
}));

export default function AnalyticsPage() {
  const { data: logs } = useRealtimeData('login_logs', (q) => 
    q.order('created_at', { ascending: false }).limit(100)
  );

  const { data: threatAlerts } = useRealtimeData('threat_alerts');

  const resolvedLogs = logs && logs.length > 0 ? logs : FALLBACK_LOGS;
  const resolvedThreats = threatAlerts && threatAlerts.length > 0 ? threatAlerts : FALLBACK_THREAT_ALERTS;

  const stats = useMemo(() => {
    const totalLogins = resolvedLogs.length;
    const failures = resolvedLogs.filter((l: any) => l.status === 'FAILURE').length;
    const failureRate = totalLogins > 0 ? ((failures / totalLogins) * 100).toFixed(1) : '0';
    const activeThreats = resolvedThreats.filter((t: any) => t.status === 'OPEN').length;

    return [
      { title: 'Total Access Events', value: totalLogins.toString(), trend: '+14%', trendUp: true, icon: Activity },
      { title: 'Failure Rate', value: `${failureRate}%`, trend: '-2.1%', trendUp: true, icon: ShieldAlert },
      { title: 'Active Threats', value: activeThreats.toString(), trend: '+5', trendUp: false, icon: TrendingUp },
      { title: 'Unique Users', value: new Set(resolvedLogs.map((l: any) => l.user_id)).size.toString(), icon: Users },
    ];
  }, [resolvedLogs, resolvedThreats]);

  const recentActivity = useMemo(() => {
    return resolvedLogs.slice(0, 5).map((log: any) => ({
      id: log.id,
      title: `${log.status === 'SUCCESS' ? 'Authorized' : 'Denied'} Access - ${log.ip_address}`,
      time: new Date(log.created_at).toLocaleTimeString(),
      status: (log.status === 'SUCCESS' ? 'success' : 'danger') as 'success' | 'warning' | 'danger'
    }));
  }, [resolvedLogs]);

  const barData = useMemo(() => {
    const authorized = resolvedLogs.filter((l: any) => l.status === 'SUCCESS').length;
    const denied = resolvedLogs.filter((l: any) => l.status === 'FAILURE').length;
    return [
      { name: 'Authorized', value: authorized },
      { name: 'Denied', value: denied },
    ];
  }, [resolvedLogs]);

  return (
    <MetricsDashboard 
      title="System Analytics & Core Metrics" 
      description="In-depth analysis of authentication patterns and adaptive security performance."
      metrics={stats}
      chartData={[
        { name: '00:00', value: 45 }, { name: '04:00', value: 30 },
        { name: '08:00', value: 180 }, { name: '12:00', value: 240 },
        { name: '16:00', value: 210 }, { name: '20:00', value: 120 }
      ]}
      barData={barData}
      recentActivity={recentActivity}
    />
  );
}
