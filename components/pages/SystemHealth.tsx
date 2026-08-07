'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Activity,
  Cpu,
  HardDrive,
  Server,
  Wifi,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from "@/context/LanguageContext";

const systemMetrics = [
  { label: 'CPU Usage', value: '45%', icon: Cpu, color: 'success', trend: '+2%' },
  { label: 'Memory Usage', value: '62%', icon: Server, color: 'warning', trend: '+5%' },
  { label: 'Disk Usage', value: '38%', icon: HardDrive, color: 'success', trend: '+1%' },
  { label: 'Network', value: '1.2 Gbps', icon: Wifi, color: 'primary', trend: '+15%' },
];

const cpuData = [
  { time: '00:00', usage: 35 },
  { time: '04:00', usage: 28 },
  { time: '08:00', usage: 52 },
  { time: '12:00', usage: 68 },
  { time: '16:00', usage: 45 },
  { time: '20:00', usage: 38 },
];

const memoryData = [
  { time: '00:00', usage: 58 },
  { time: '04:00', usage: 55 },
  { time: '08:00', usage: 64 },
  { time: '12:00', usage: 72 },
  { time: '16:00', usage: 62 },
  { time: '20:00', usage: 59 },
];

const services = [
  { name: 'Web Server', status: 'Running', uptime: '45 days', cpu: '23%', memory: '1.2 GB' },
  { name: 'Database', status: 'Running', uptime: '45 days', cpu: '45%', memory: '8.4 GB' },
  { name: 'API Gateway', status: 'Running', uptime: '30 days', cpu: '12%', memory: '512 MB' },
  { name: 'Authentication Service', status: 'Running', uptime: '45 days', cpu: '8%', memory: '256 MB' },
  { name: 'Cache Server', status: 'Warning', uptime: '15 days', cpu: '67%', memory: '4.2 GB' },
  { name: 'Queue Worker', status: 'Running', uptime: '45 days', cpu: '18%', memory: '768 MB' },
];

const alerts = [
  { severity: 'warning', message: 'Cache Server high CPU usage detected', time: '15 min ago' },
  { severity: 'info', message: 'Database backup completed successfully', time: '2 hours ago' },
  { severity: 'info', message: 'System update available', time: '5 hours ago' },
];

export function SystemHealth() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'System health'}</h1>
              <p className="text-muted-foreground">
                {'Monitorsystempe'}</p>
            </div>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {'Refresh'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {systemMetrics.map((metric, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${metric.color}/20 flex items-center justify-center`}>
                    <metric.icon className={`w-6 h-6 text-${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <h3 className="text-2xl font-semibold">{metric.value}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      {metric.trend}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  {t('CPUUsage24h_1275')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={cpuData}>
                    <defs>
                      <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="monotone"
                      dataKey="usage"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#cpuGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  {t('MemoryUsage24h_1276')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={memoryData}>
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
                    <Line
                      type="monotone"
                      dataKey="usage"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {'Services status'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium">{'Service'}</th>
                      <th className="text-left p-3 font-medium">{'Status'}</th>
                      <th className="text-left p-3 font-medium">{'Uptime'}</th>
                      <th className="text-left p-3 font-medium">{'Cpu'}</th>
                      <th className="text-left p-3 font-medium">{'Memory'}</th>
                      <th className="text-right p-3 font-medium">{'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service, index) => (
                      <tr key={index} className="border-b border-border hover:bg-input-background/30">
                        <td className="p-3 text-sm font-medium">{service.name}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 w-fit ${
                            service.status === 'Running' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          }`}>
                            {service.status === 'Running' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {service.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{service.uptime}</td>
                        <td className="p-3 text-sm">{service.cpu}</td>
                        <td className="p-3 text-sm">{service.memory}</td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm">
                            {'Details'}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{'System alerts'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 rounded-lg bg-input-background/30"
                  >
                    <div className="flex items-start gap-3">
                      {alert.severity === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium mb-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{alert.time}</p>
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
