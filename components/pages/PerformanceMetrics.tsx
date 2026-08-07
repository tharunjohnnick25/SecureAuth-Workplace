'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Activity, TrendingUp, Clock, Zap, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from "@/context/LanguageContext";

const performanceData = [
  { time: '00:00', response: 145, throughput: 2400, errors: 2 },
  { time: '04:00', response: 132, throughput: 1800, errors: 1 },
  { time: '08:00', response: 198, throughput: 3200, errors: 5 },
  { time: '12:00', response: 234, throughput: 4100, errors: 8 },
  { time: '16:00', response: 189, throughput: 3600, errors: 4 },
  { time: '20:00', response: 156, throughput: 2900, errors: 2 },
];

const metrics = [
  { label: 'Avg Response Time', value: '178ms', icon: Clock, color: 'success', trend: '-12ms' },
  { label: 'Throughput', value: '3,200 req/s', icon: Activity, color: 'primary', trend: '+450' },
  { label: 'Error Rate', value: '0.08%', icon: TrendingUp, color: 'warning', trend: '-0.02%' },
  { label: 'Uptime', value: '99.98%', icon: Zap, color: 'success', trend: '+0.01%' },
];

export function PerformanceMetrics() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Performance metr'}</h1>
              <p className="text-muted-foreground">{'Monitorapplicat'}</p>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {'Export report'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${metric.color}/20 flex items-center justify-center`}>
                    <metric.icon className={`w-6 h-6 text-${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <h3 className="text-2xl font-semibold">{metric.value}</h3>
                    <p className="text-xs text-success mt-1">{metric.trend}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('ResponseTime24h_1066')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                    <XAxis dataKey="time" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="response" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Throughput24h_1067')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                    <XAxis dataKey="time" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px' }} />
                    <Bar dataKey="throughput" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
