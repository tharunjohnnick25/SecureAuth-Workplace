'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  MapPin,
  Globe,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { useLanguage } from "@/context/LanguageContext";
import { toast } from 'sonner';

const loginLocations = [
  { city: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060, logins: 1245, status: 'normal', risk: 'low' },
  { city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, logins: 892, status: 'normal', risk: 'low' },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, logins: 654, status: 'normal', risk: 'low' },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, logins: 432, status: 'normal', risk: 'low' },
  { city: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, logins: 298, status: 'normal', risk: 'low' },
  { city: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, logins: 187, status: 'normal', risk: 'low' },
  { city: 'Unknown Location', country: 'Suspicious', lat: 45.0, lng: 25.0, logins: 23, status: 'suspicious', risk: 'high' },
];

const topCountries = [
  { country: 'United States', flag: '🇺🇸', logins: 1450, percentage: 35 },
  { country: 'United Kingdom', flag: '🇬🇧', logins: 920, percentage: 22 },
  { country: 'Japan', flag: '🇯🇵', logins: 680, percentage: 16 },
  { country: 'Singapore', flag: '🇸🇬', logins: 450, percentage: 11 },
  { country: 'Brazil', flag: '🇧🇷', logins: 320, percentage: 8 },
  { country: 'Others', flag: '🌍', logins: 330, percentage: 8 },
];

const recentLogins = [
  { user: 'sarah.chen@company.com', location: 'New York, US', ip: '192.168.1.105', time: '2 min ago', risk: 'low' },
  { user: 'michael.r@company.com', location: 'London, UK', ip: '203.0.113.45', time: '15 min ago', risk: 'low' },
  { user: 'emily.t@company.com', location: 'Tokyo, JP', ip: '198.51.100.89', time: '1 hour ago', risk: 'low' },
  { user: 'unknown@suspicious.com', location: 'Unknown', ip: '45.33.32.156', time: '2 hours ago', risk: 'high' },
];

const anomalies = [
  { type: 'Impossible Travel', description: 'Login from Tokyo 30 minutes after login from New York', user: 'david.kim@company.com', severity: 'high' },
  { type: 'New Location', description: 'First login from North Korea detected', user: 'unknown', severity: 'critical' },
  { type: 'VPN Detection', description: 'Multiple logins from known VPN exit nodes', user: 'lisa.a@company.com', severity: 'medium' },
];

export function GeolocationMap() {
    const { t } = useLanguage();
  const { data: dbLogins } = useRealtimeData('login_logs');

  const locations = useMemo(() => {
    if (!dbLogins || dbLogins.length === 0) return loginLocations;
    // Count logins per city
    const counts: Record<string, any> = {};
    dbLogins.forEach((l: any) => {
      const city = l.city || 'Unknown';
      if (!counts[city]) {
        counts[city] = { city, country: l.country || 'XX', lat: 0, lng: 0, logins: 0, status: 'normal', risk: 'low' };
      }
      counts[city].logins++;
      if (l.status !== 'SUCCESS') counts[city].status = 'suspicious';
      if (l.risk_score > 70) counts[city].risk = 'high';
    });
    return Object.values(counts);
  }, [dbLogins]);

  const [filterRisk, setFilterRisk] = useState('all');

  const filteredLocations = useMemo(() => {
    return locations.filter((loc: any) => filterRisk === 'all' || loc.risk === filterRisk);
  }, [locations, filterRisk]);

  const filteredRecentLogins = useMemo(() => {
    return recentLogins.filter((login) => filterRisk === 'all' || login.risk === filterRisk);
  }, [filterRisk]);

  const handleExport = () => {
    const csv = [
      ['City', 'Country', 'Logins', 'Status', 'Risk'],
      ...filteredLocations.map((l: any) => [l.city, l.country, l.logins, l.status, l.risk])
    ].map(e => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geolocation_export.csv';
    a.click();
    toast.success('Exported geolocation data');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Geographic login'}</h1>
              <p className="text-muted-foreground">
                {'Trackandvisuali'}</p>
            </div>
            <div className="flex gap-3">
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                <option className="bg-[#0f172a]" value="all">All Risks</option>
                <option className="bg-[#0f172a]" value="low">Low Risk</option>
                <option className="bg-[#0f172a]" value="high">High Risk</option>
              </select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                {'Export'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Countries'}</p>
                  <h3 className="text-2xl font-semibold">45</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Activelocations'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Total logins'}</p>
                  <h3 className="text-2xl font-semibold">4,150</h3>
                  <p className="text-xs text-success mt-1">{t('Last24hours_904')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Normal'}</p>
                  <h3 className="text-2xl font-semibold">4,127</h3>
                  <p className="text-xs text-muted-foreground mt-1">99.4%</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Suspicious'}</p>
                  <h3 className="text-2xl font-semibold">23</h3>
                  <p className="text-xs text-destructive mt-1">{'Requiresreview'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {'World map'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-input-background/30 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    {'Interactiveworl'}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {'Showing'} {filteredLocations.length} {'Activelocations'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Top countries'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCountries.map((country, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{country.flag}</span>
                          <span className="text-sm font-medium">{country.country}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{country.logins.toLocaleString()} {'Logins'}</span>
                      </div>
                      <div className="w-full bg-input-background rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {'Location anomali'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {anomalies.map((anomaly, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{anomaly.type}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          anomaly.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                          anomaly.severity === 'high' ? 'bg-warning/20 text-warning' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                      <p className="text-xs text-muted-foreground">{'User'}{anomaly.user}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Recent login loca'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRecentLogins.map((login, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          login.risk === 'high' ? 'bg-destructive' : 'bg-success'
                        }`} />
                        <div>
                          <p className="text-sm font-medium mb-1">{login.user}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{login.location}</span>
                            <span>•</span>
                            <span className="font-mono">{login.ip}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{login.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Login heatmap sta'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="text-sm font-medium mb-3">{'Peak login hours u'}</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold mb-1">{t('911AM_919')}</div>
                        <div className="text-xs text-muted-foreground">{'Europe'}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold mb-1">{t('24PM_921')}</div>
                        <div className="text-xs text-muted-foreground">{'Americas'}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold mb-1">{t('68AM_923')}</div>
                        <div className="text-xs text-muted-foreground">{'Asia'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-input-background/30">
                    <h4 className="text-sm font-medium mb-3">{'Geographic distr'}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{'North america'}</span>
                        <span className="font-medium">38%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{'Europe'}</span>
                        <span className="font-medium">32%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{'Asia pacific'}</span>
                        <span className="font-medium">25%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{'Other'}</span>
                        <span className="font-medium">5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
