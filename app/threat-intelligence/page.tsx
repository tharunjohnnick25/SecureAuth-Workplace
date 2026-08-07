// @ts-nocheck
'use client';

import { MetricsDashboard } from '@/components/pages/MetricsDashboard';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { ShieldAlert, ShieldCheck, Zap, Globe, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

export default function ThreatIntelligencePage() {
  const { data: alerts, loading } = useRealtimeData('alerts', (q) => 
    q.order('created_at', { ascending: false }).limit(50)
  );
  
  const { data: riskScores } = useRealtimeData('risk_scores');

  const stats = useMemo(() => {
    const highRisk = alerts?.filter((a: any) => a.severity === 'critical' || a.severity === 'warning').length || 0;
    const avgScore = riskScores?.length 
      ? (riskScores.reduce((acc: number, curr: any) => acc + Number(curr.score), 0) / riskScores.length).toFixed(1)
      : '0.0';
    
    return [
      { title: 'Critical Threats', value: highRisk.toString(), trend: '+2', trendUp: false, icon: AlertTriangle },
      { title: 'Avg Risk Score', value: avgScore, trend: '-0.5', trendUp: true, icon: Zap },
      { title: 'Shield Integrity', value: '98.4%', trend: '+0.1%', trendUp: true, icon: ShieldCheck },
      { title: 'Monitored Nodes', value: alerts?.length.toString() || '0', icon: Globe },
    ];
  }, [alerts, riskScores]);

  const recentActivity = useMemo(() => {
    return alerts?.map((alert: any) => ({
      id: alert.id,
      title: alert.type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN ALERT',
      time: new Date(alert.created_at).toLocaleTimeString(),
      status: (alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'success') as 'success' | 'warning' | 'danger'
    })) || [];
  }, [alerts]);

  const chartData = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];
    
    // Group alerts by day of the week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    
    alerts.forEach((a: any) => {
      const date = new Date(a.created_at);
      const dayName = days[date.getDay()];
      counts[dayName as keyof typeof counts]++;
    });

    return [
      { name: 'Mon', value: counts.Mon },
      { name: 'Tue', value: counts.Tue },
      { name: 'Wed', value: counts.Wed },
      { name: 'Thu', value: counts.Thu },
      { name: 'Fri', value: counts.Fri },
      { name: 'Sat', value: counts.Sat },
      { name: 'Sun', value: counts.Sun }
    ];
  }, [alerts]);

  const barData = useMemo(() => {
    if (!alerts) return [];
    const critical = alerts.filter((a: any) => a.severity === 'critical').length;
    const warning = alerts.filter((a: any) => a.severity === 'warning').length;
    const info = alerts.filter((a: any) => a.severity === 'info').length;
    return [
      { name: 'Critical', value: critical },
      { name: 'Warning', value: warning },
      { name: 'Info', value: info },
    ];
  }, [alerts]);

  return (
    <MetricsDashboard 
      title="Intelligence & Threat Analysis" 
      description="AI-driven realtime threat detection and planetary risk monitoring."
      metrics={stats}
      chartData={chartData}
      barData={barData}
      recentActivity={recentActivity}
    />
  );
}