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



export function AnalyticsTab({ hideLayout }: { hideLayout?: boolean }) {
  const { data: logs } = useRealtimeData('login_logs', (q) => 
    q.order('created_at', { ascending: false }).limit(100)
  );

  const { data: threatAlerts } = useRealtimeData('threat_alerts');

  const resolvedLogs = logs && logs.length > 0 ? logs : [];
  const resolvedThreats = threatAlerts && threatAlerts.length > 0 ? threatAlerts : [];

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
      chartData={[]}
      barData={barData}
      recentActivity={recentActivity}
      hideLayout={hideLayout}
    />
  );
}
