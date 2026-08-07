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

const FALLBACK_ALERTS = [
  { id: 'alert-1', type: 'SUSPICIOUS_LOGIN_ATTEMPT', severity: 'warning', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'alert-2', type: 'NEW_DEVICE_REGISTERED', severity: 'info', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'alert-3', type: 'FAILED_MFA_ATTEMPT', severity: 'critical', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'alert-4', type: 'POLICY_UPDATE_DEPLOYED', severity: 'info', created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 'alert-5', type: 'VPN_ACCESS_FROM_NEW_REGION', severity: 'warning', created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 'alert-6', type: 'MALWARE_DETECTED_BLOCKED', severity: 'critical', created_at: new Date(Date.now() - 18000000).toISOString() },
];

export default function SecurityCenterPage() {
  const { data: realAlerts } = useRealtimeData('alerts');

  const alerts = useMemo(() => {
    if (realAlerts && realAlerts.length > 0) return realAlerts;
    return FALLBACK_ALERTS;
  }, [realAlerts]);

  const stats = useMemo(() => {
    const criticalAlerts = alerts?.filter((a: any) => a.severity === 'critical').length || 0;
    
    return [
      { title: 'Security Status', value: 'OPTIMAL', trend: 'Secure', trendUp: true, icon: Shield },
      { title: 'System Alerts', value: criticalAlerts.toString(), trend: '-12%', trendUp: true, icon: AlertCircle },
      { title: 'Active MFA Nodes', value: '1,240', trend: '+140', trendUp: true, icon: Fingerprint },
      { title: 'Protocols Active', value: '12', icon: Lock },
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
      chartData={[
        { name: 'Jan', value: 85 }, { name: 'Feb', value: 88 },
        { name: 'Mar', value: 92 }, { name: 'Apr', value: 90 },
        { name: 'May', value: 95 }, { name: 'Jun', value: 98 }
      ]}
      barData={barData}
      recentActivity={recentActivity}
    />
  );
}
