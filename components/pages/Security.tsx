'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useLanguage } from "@/context/LanguageContext";

export function Security() {
    const { t } = useLanguage();
  const { data: dbThreats, loading: threatsLoading } = useRealtimeData('threat_logs', (q) =>
    q.select('*').order('created_at', { ascending: false }).limit(20)
  );
  const { data: dbLogins, loading: loginsLoading } = useRealtimeData('login_logs', (q) =>
    q.select('*').order('created_at', { ascending: false }).limit(100)
  );

  const securityAlerts = useMemo(() => {
    if (!dbThreats || dbThreats.length === 0) return [];
    return dbThreats.map((t: any) => ({
      id: t.id,
      type: t.severity === 'CRITICAL' ? 'critical' : t.severity === 'HIGH' ? 'warning' : 'info',
      title: t.type?.replace(/_/g, ' ') || 'Security Alert',
      description: t.description || 'No details available',
      time: t.created_at ? new Date(t.created_at).toLocaleString() : 'Unknown',
      status: t.is_read ? 'resolved' : 'active',
    }));
  }, [dbThreats]);

  const activeAlerts = useMemo(() => securityAlerts.filter((a) => a.status === 'active').length, [securityAlerts]);

  const locationActivity = useMemo(() => {
    if (!dbLogins || dbLogins.length === 0) return [];
    const locationMap = new Map<string, { country: string; city: string; logins: number; risk: string }>();
    dbLogins.forEach((l: any) => {
      const city = l.city || l.location?.city || 'Unknown';
      const country = l.country || l.location?.country || 'XX';
      const key = `${city},${country}`;
      const existing = locationMap.get(key);
      const riskScore = l.risk_score || 0;
      const risk = riskScore > 70 ? 'high' : riskScore > 30 ? 'medium' : 'low';
      if (existing) {
        existing.logins++;
        if (risk === 'high' || (risk === 'medium' && existing.risk !== 'high')) {
          existing.risk = risk;
        }
      } else {
        locationMap.set(key, { country, city, logins: 1, risk });
      }
    });
    return Array.from(locationMap.values())
      .sort((a, b) => b.logins - a.logins)
      .slice(0, 10);
  }, [dbLogins]);

  const maxLogins = useMemo(() => Math.max(...locationActivity.map(l => l.logins), 1), [locationActivity]);
  const resolvedToday = useMemo(() => securityAlerts.filter(a => a.status === 'resolved').length, [securityAlerts]);
  const securityScore = useMemo(() => {
    const total = securityAlerts.length;
    const active = activeAlerts;
    if (total === 0) return 100;
    return Math.max(0, 100 - Math.round((active / Math.max(total, 1)) * 50));
  }, [securityAlerts, activeAlerts]);
  const isLoading = threatsLoading || loginsLoading;

  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Security center'}</h1>
            <p className="text-muted-foreground">
              {'Monitorandrespo'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Active alerts'}</p>
                  <h3 className="text-2xl font-semibold">{activeAlerts}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Addressed'}</p>
                  <h3 className="text-2xl font-semibold">{resolvedToday}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Security score'}</p>
                  <h3 className="text-2xl font-semibold">{securityScore}/100</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Security alerts'}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : securityAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {'Nosecurityalert'}</div>
                ) : (
                  <div className="space-y-4">
                    {securityAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              alert.type === 'critical'
                                ? 'bg-destructive/20'
                                : alert.type === 'warning'
                                ? 'bg-warning/20'
                                : 'bg-success/20'
                            }`}
                          >
                            {alert.type === 'critical' ? (
                              <XCircle className="w-5 h-5 text-destructive" />
                            ) : alert.type === 'warning' ? (
                              <AlertTriangle className="w-5 h-5 text-warning" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-success" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {alert.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {alert.time}
                              </span>
                              {alert.status === 'active' && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    {'Investigate'}</Button>
                                  <Button size="sm" variant="ghost">
                                    {'Dismiss'}</Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Location activit'}</CardTitle>
              </CardHeader>
              <CardContent>
                {locationActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {'Nolocationdataa'}</div>
                ) : (
                  <div className="space-y-4">
                    {locationActivity.map((location, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <h4 className="font-medium">
                              {location.city}, {location.country}
                            </h4>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              location.risk === 'high'
                                ? 'bg-destructive/20 text-destructive'
                                : location.risk === 'medium'
                                ? 'bg-warning/20 text-warning'
                                : 'bg-success/20 text-success'
                            }`}
                          >
                            {location.risk}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {location.logins} {'Logins'}</span>
                          <div className="w-32 bg-muted rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                location.risk === 'high'
                                  ? 'bg-destructive'
                                  : location.risk === 'medium'
                                  ? 'bg-warning'
                                  : 'bg-success'
                              }`}
                              style={{ width: `${(location.logins / maxLogins) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
