'use client';

import { MetricsDashboard } from '@/components/pages/MetricsDashboard';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { 
  Shield, 
  Lock, 
  AlertCircle,
  Fingerprint
} from 'lucide-react';
import { useMemo } from 'react';

export function SecurityCenterTab() {
  const { data: realAlerts } = useRealtimeData('alerts');

  const alerts = useMemo(() => {
    return realAlerts || [];
  }, [realAlerts]);

  const stats = useMemo(() => {
    const criticalAlerts = alerts?.filter((a: any) => a.severity === 'critical').length || 0;
    
    return [
      { title: 'Security Status', value: criticalAlerts === 0 ? 'OPTIMAL' : 'AT RISK', trend: 'Secure', trendUp: criticalAlerts === 0, icon: Shield },
      { title: 'System Alerts', value: criticalAlerts.toString(), trend: 'Active', trendUp: false, icon: AlertCircle },
      { title: 'Active MFA Nodes', value: '0', trend: '0', trendUp: true, icon: Fingerprint },
      { title: 'Protocols Active', value: '0', icon: Lock },
    ];
  }, [alerts]);

  const recentActivity = useMemo(() => {
    return alerts?.slice(0, 5).map((alert: any) => ({
      id: alert.id,
      title: (alert.type || 'System Event').replace(/_/g, ' '),
      time: new Date(alert.created_at).toLocaleTimeString(),
      status: (alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'success') as 'success' | 'warning' | 'danger'
    })) || [];
  }, [alerts]);

  const barData = useMemo(() => {
    const bySeverity = (alerts || []).reduce<Record<string, number>>((acc, a: any) => {
      const key = (a.severity || 'info').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: 'Critical', value: bySeverity.critical || 0 },
      { name: 'Warning', value: bySeverity.warning || 0 },
      { name: 'Info', value: bySeverity.info || 0 },
    ];
  }, [alerts]);

  return (
    <MetricsDashboard 
      title="Global Security Control Center" 
      description="Manage enterprise-wide authentication protocols, zero-trust policies, and system hardening."
      metrics={stats}
      chartData={[]}
      barData={barData}
      recentActivity={recentActivity}
      hideLayout={true}
    />
  );
}
