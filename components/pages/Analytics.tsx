'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { PageHeader } from '@/components/PageHeader';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, ShieldCheck, Globe, Zap } from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useLanguage } from "@/context/LanguageContext";

export function Analytics() {
    const { t } = useLanguage();
  const { data: logins } = useRealtimeData('login_logs');
  const { data: alerts } = useRealtimeData('threat_logs');

  const stats = useMemo(() => {
    const total = (logins as any[]).length || 1;
    const success = (logins as any[]).filter((l: any) => l.status === 'success').length;
    const rate = ((success / total) * 100).toFixed(1);
    const failed = (logins as any[]).filter((l: any) => l.status !== 'success').length;
    
    return { total, success, rate, failed };
  }, [logins]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      logins: 0
    }));

    (logins as any[]).forEach((log: any) => {
      const hour = new Date(log.created_at).getHours();
      hours[hour].logins++;
    });

    return hours;
  }, [logins]);

  const weeklyTrends = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(day => ({ day, success: 0, failed: 0, risky: 0 }));

    (logins as any[]).forEach((log: any) => {
      const dayIndex = new Date(log.created_at).getDay();
      const dayData = data[dayIndex];
      if (log.status === 'success') dayData.success++;
      else dayData.failed++;
      if ((log.risk_score || 0) > 50) dayData.risky++;
    });

    return data;
  }, [logins]);

  const heatmapData = useMemo(() => {
    // 7 days * 24 hours = 168 cells
    // For simplicity, showing 7x7 intensity grid
    const grid = Array.from({ length: 49 }).fill(0) as number[];
    (logins as any[]).forEach((log: any) => {
      const date = new Date(log.created_at);
      const day = date.getDay();
      const hourBlock = Math.floor(date.getHours() / 3.5); // Normalize to 7 blocks
      const index = (day * 7) + hourBlock;
      grid[index]++;
    });
    const max = Math.max(...grid) || 1;
    return grid.map(v => v / max);
  }, [logins]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <PageHeader 
            title="Security Analytics" 
            description="Deep behavioral insights and threat vector analysis"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Auth success rate'}</p>
                  <h3 className="text-2xl font-semibold">{stats.rate}%</h3>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    {'Live optimizatio'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Total events proc'}</p>
                  <h3 className="text-2xl font-semibold">{stats.total.toLocaleString()}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Acrossallvector'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Blocked anomalie'}</p>
                  <h3 className="text-2xl font-semibold">{stats.failed}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Currentbillingp'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Auth load distrib'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" vertical={false} />
                      <XAxis dataKey="hour" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.9)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="logins" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Weekly vector cor'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" vertical={false} />
                      <XAxis dataKey="day" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.9)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="risky" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Global access hea'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <div key={`${day}-${i}`} className="text-center text-[10px] text-muted-foreground font-medium mb-1">{day}</div>
                  ))}
                  {heatmapData.map((intensity, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-sm transition-all hover:scale-110"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.05, intensity)})`,
                        boxShadow: intensity > 0.8 ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none'
                      }}
                    />
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                   <div className="flex items-center gap-2">
                     <Globe className="w-3 h-3" />
                     <span>{'Normalizingglob'}</span>
                   </div>
                   <div className="flex gap-1">
                      {[0.2, 0.4, 0.6, 0.8, 1.0].map(o => (
                        <div key={o} className="w-2 h-2 rounded-sm" style={{ backgroundColor: `rgba(99, 102, 241, ${o})` }} />
                      ))}
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Live threat intel'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                   {(alerts as any[]).map((alert: any) => (
                     <div key={alert.id} className="p-3 rounded-lg bg-input-background/30 border-l-2 transition-all hover:bg-input-background/50" 
                          style={{ borderColor: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f59e0b' : '#6366f1' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            alert.severity === 'critical' ? 'text-destructive' : 'text-primary'
                          }`}>
                            {alert.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{alert.message}</p>
                     </div>
                   ))}
                   {alerts.length === 0 && (
                     <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                       {'Noactivethreats'}</div>
                   )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

