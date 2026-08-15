'use client';

import { MetricsDashboard } from '@/components/pages/MetricsDashboard';
import { MapPin, Users, ShieldAlert, LogIn } from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useMemo } from 'react';

export function OfficeLoginsTab() {
  const { data: dbLogs } = useRealtimeData('office_access_logs');
  const { data: threatLogs } = useRealtimeData('threat_logs');

  const stats = useMemo(() => {
    const active = dbLogs?.filter((l: any) => l.access_type === 'ENTRY').length || 0;
    const suspicious = threatLogs?.length || 0;
    
    return [
      { title: 'Active On-Site', value: active.toString(), trend: 'Live', trendUp: true, icon: Users, href: '/office-logins/onsite' },
      { title: 'Remote Logins', value: '0', trend: 'Live', trendUp: true, icon: LogIn, href: '/office-logins/remote' },
      { title: 'Suspicious Locations', value: suspicious.toString(), trend: 'Active', trendUp: false, icon: ShieldAlert, href: '/office-logins/suspicious' },
      { title: 'Monitored Offices', value: '0', icon: MapPin, href: '/office-logins/offices' },
    ];
  }, [dbLogs, threatLogs]);

  const recent = useMemo(() => {
    if (!dbLogs || dbLogs.length === 0) return [];
    return dbLogs.slice(0, 5).map((l: any) => ({
      id: l.id,
      title: `${l.access_type === 'ENTRY' ? 'Check-in' : 'Check-out'} at ${l.location}`,
      time: new Date(l.timestamp).toLocaleTimeString(),
      status: 'success' as const
    }));
  }, [dbLogs]);

  return (
    <MetricsDashboard 
      title="Office Logins & Geolocation" 
      description="Monitor physical access and geo-fenced attendance."
      metrics={stats}
      chartData={[]}
      recentActivity={recent}
      hideLayout={true}
    />
  );
}