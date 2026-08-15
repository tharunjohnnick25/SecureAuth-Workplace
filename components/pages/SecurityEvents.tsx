'use client';

import { useMemo, useState } from 'react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import {
  Shield,
  AlertTriangle,
  Activity,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from "@/context/LanguageContext";

const securityEvents = [
  { id: 'EVT-2024-0891', type: 'Brute Force Attack', severity: 'critical', source: '45.33.32.156', target: 'SSH Server', status: 'Blocked', timestamp: '2026-04-30 14:35:12' },
  { id: 'EVT-2024-0890', type: 'Unauthorized Access', severity: 'high', source: '203.0.113.45', target: 'Admin Panel', status: 'Investigating', timestamp: '2026-04-30 14:28:45' },
  { id: 'EVT-2024-0889', type: 'Malware Detection', severity: 'high', source: 'Endpoint-042', target: 'File System', status: 'Quarantined', timestamp: '2026-04-30 14:15:33' },
  { id: 'EVT-2024-0888', type: 'SQL Injection Attempt', severity: 'medium', source: '198.51.100.89', target: 'Web Application', status: 'Blocked', timestamp: '2026-04-30 13:42:18' },
  { id: 'EVT-2024-0887', type: 'DDoS Attack', severity: 'critical', source: 'Multiple IPs', target: 'Load Balancer', status: 'Mitigated', timestamp: '2026-04-30 12:20:05' },
  { id: 'EVT-2024-0886', type: 'Privilege Escalation', severity: 'high', source: 'Internal User', target: 'Database', status: 'Resolved', timestamp: '2026-04-30 11:15:22' },
];

const eventTrend = [
  { time: '00:00', critical: 5, high: 12, medium: 23, low: 45 },
  { time: '04:00', critical: 8, high: 15, medium: 28, low: 52 },
  { time: '08:00', critical: 12, high: 22, medium: 35, low: 48 },
  { time: '12:00', critical: 15, high: 28, medium: 42, low: 55 },
  { time: '16:00', critical: 10, high: 18, medium: 30, low: 42 },
  { time: '20:00', critical: 7, high: 14, medium: 25, low: 38 },
];

const eventStats = [
  { label: 'Total Events', value: '1,234', change: '+15%', trend: 'up', color: 'primary' },
  { label: 'Critical', value: '57', change: '+8%', trend: 'up', color: 'destructive' },
  { label: 'Blocked', value: '892', change: '+12%', trend: 'up', color: 'success' },
  { label: 'Active Threats', value: '12', change: '-5%', trend: 'down', color: 'warning' },
];

export function SecurityEvents() {
  const { t } = useLanguage();
  const { data: dbEvents } = useRealtimeData('threat_logs');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const events = useMemo(() => {
    let sourceEvents = securityEvents;
    if (dbEvents && dbEvents.length > 0) {
      sourceEvents = dbEvents.map((e: any) => ({
        id: e.id.substring(0, 8),
        type: e.type,
        severity: e.severity?.toLowerCase() || 'medium',
        source: e.source_ip || 'Internal',
        target: 'System',
        status: 'Active',
        timestamp: new Date(e.created_at).toLocaleString()
      }));
    }
    
    return sourceEvents.filter((event) => {
      const matchesSeverity = filterSeverity === 'all' || event.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' || event.status.toLowerCase() === filterStatus.toLowerCase();
      return matchesSeverity && matchesStatus;
    });
  }, [dbEvents, filterSeverity, filterStatus]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <PageHeader 
            title="Security Events" 
            description="Monitor and respond to security events in real-time"
          >
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            >
              <option className="bg-[#0f172a]" value="all">All Severities</option>
              <option className="bg-[#0f172a]" value="critical">Critical</option>
              <option className="bg-[#0f172a]" value="high">High</option>
              <option className="bg-[#0f172a]" value="medium">Medium</option>
              <option className="bg-[#0f172a]" value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            >
              <option className="bg-[#0f172a]" value="all">All Statuses</option>
              <option className="bg-[#0f172a]" value="blocked">Blocked</option>
              <option className="bg-[#0f172a]" value="investigating">Investigating</option>
              <option className="bg-[#0f172a]" value="quarantined">Quarantined</option>
              <option className="bg-[#0f172a]" value="mitigated">Mitigated</option>
              <option className="bg-[#0f172a]" value="resolved">Resolved</option>
              <option className="bg-[#0f172a]" value="active">Active</option>
            </select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {'Export'}</Button>
          </PageHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {eventStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${stat.color}/20 flex items-center justify-center`}>
                    <Activity className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-semibold">{stat.value}</h3>
                    <p className={`text-xs flex items-center gap-1 mt-1 ${
                      stat.trend === 'up' ? 'text-destructive' : 'text-success'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {'Event timeline la'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={eventTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="medium" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {'Recent security e'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          event.severity === 'critical' ? 'bg-destructive/20' :
                          event.severity === 'high' ? 'bg-warning/20' :
                          event.severity === 'medium' ? 'bg-primary/20' : 'bg-success/20'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${
                            event.severity === 'critical' ? 'text-destructive' :
                            event.severity === 'high' ? 'text-warning' :
                            event.severity === 'medium' ? 'text-primary' : 'text-success'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{event.id}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              event.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                              event.severity === 'high' ? 'bg-warning/20 text-warning' :
                              event.severity === 'medium' ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'
                            }`}>
                              {event.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-2">{event.type}</p>
                          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div>
                              <span className="block">{'Source'}</span>
                              <span className="font-mono text-foreground">{event.source}</span>
                            </div>
                            <div>
                              <span className="block">{'Target'}</span>
                              <span className="text-foreground">{event.target}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`text-xs px-2 py-1 rounded inline-block mb-2 ${
                          event.status === 'Blocked' || event.status === 'Mitigated' || event.status === 'Resolved'
                            ? 'bg-success/20 text-success'
                            : event.status === 'Quarantined'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {event.status}
                        </span>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {event.timestamp}
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Eye className="w-3 h-3 mr-1" />
                          {'Details'}</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

