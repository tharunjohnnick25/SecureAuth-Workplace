'use client';

import { useState } from 'react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const auditLogs: any[] = [];

const activityStats = [
  { label: 'Total Events', value: '12,456', icon: Activity, color: 'primary' },
  { label: 'Critical Events', value: '23', icon: AlertTriangle, color: 'destructive' },
  { label: 'Success Rate', value: '98.2%', icon: CheckCircle, color: 'success' },
  { label: 'Failed Actions', value: '187', icon: XCircle, color: 'warning' },
];

const topActions = [
  { action: 'User Login', count: 3245, percentage: 26 },
  { action: 'Data Access', count: 2891, percentage: 23 },
  { action: 'Settings Changed', count: 1567, percentage: 13 },
  { action: 'Report Generated', count: 1234, percentage: 10 },
  { action: 'API Request', count: 1089, percentage: 9 },
];

export function AuditLogs() {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const filteredLogs = auditLogs.filter(log => {
      const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.includes(searchTerm);
      const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' || log.status.toLowerCase() === filterStatus.toLowerCase();
      
      return matchesSearch && matchesSeverity && matchesStatus;
    });

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">Audit logs</h1>
              <p className="text-muted-foreground">
                Track all system activity and administrative actions.</p>
            </div>
            <div className="flex gap-3">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                <option className="bg-[#0f172a]" value="all">All Severities</option>
                <option className="bg-[#0f172a]" value="info">Info</option>
                <option className="bg-[#0f172a]" value="warning">Warning</option>
                <option className="bg-[#0f172a]" value="critical">Critical</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                <option className="bg-[#0f172a]" value="all">All Statuses</option>
                <option className="bg-[#0f172a]" value="success">Success</option>
                <option className="bg-[#0f172a]" value="failed">Failed</option>
                <option className="bg-[#0f172a]" value="blocked">Blocked</option>
              </select>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                {'Date range'}</Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                {'Export'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {activityStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${stat.color}/20 flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-semibold">{stat.value}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {'Recent activity'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search audit logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium">{'Timestamp'}</th>
                      <th className="text-left p-3 font-medium">{'User'}</th>
                      <th className="text-left p-3 font-medium">{'Action'}</th>
                      <th className="text-left p-3 font-medium">{'Resource'}</th>
                      <th className="text-left p-3 font-medium">{'Ipaddress'}</th>
                      <th className="text-left p-3 font-medium">{'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-input-background/30">
                        <td className="p-3 text-sm">{log.timestamp}</td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {log.user}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            {log.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            {log.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-warning" />}
                            {log.action}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{log.resource}</td>
                        <td className="p-3 text-sm font-mono text-xs">{log.ipAddress}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.status === 'Success' ? 'bg-success/20 text-success' :
                            log.status === 'Failed' ? 'bg-destructive/20 text-destructive' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Showing 8 of 12,456 logs</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">{'Previous'}</Button>
                  <Button variant="outline" size="sm">{'Next'}</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Top actions'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topActions.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{item.action}</span>
                        <span className="text-sm text-muted-foreground">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-input-background rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Retention policy'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="font-medium mb-2">{'Current settings'}</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Retention period</span>
                        <span className="font-medium text-foreground">90 days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Archive location</span>
                        <span className="font-medium text-foreground">S3 Bucket</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Compliance standard</span>
                        <span className="font-medium text-foreground">SOC 2</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Important notice</h4>
                    <p className="text-sm text-muted-foreground">
                      Audit logs older than 90 days will be moved to cold storage.</p>
                  </div>
                  <Button className="w-full">{'Configure retent'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
