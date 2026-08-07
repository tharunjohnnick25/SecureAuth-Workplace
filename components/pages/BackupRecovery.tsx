'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Database,
  Download,
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCw,
  HardDrive,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const backups = [
  { id: '1', name: 'Full System Backup', type: 'Full', size: '245 GB', status: 'Completed', date: '2026-04-30 02:00', duration: '2h 15m', retention: '30 days' },
  { id: '2', name: 'Incremental Backup', type: 'Incremental', size: '12 GB', status: 'Completed', date: '2026-04-30 14:00', duration: '15m', retention: '7 days' },
  { id: '3', name: 'Database Backup', type: 'Database', size: '89 GB', status: 'Completed', date: '2026-04-30 06:00', duration: '45m', retention: '90 days' },
  { id: '4', name: 'Configuration Backup', type: 'Config', size: '2.3 GB', status: 'In Progress', date: '2026-04-30 15:00', duration: 'Running', retention: '30 days' },
];

const backupStats = [
  { label: 'Total Backups', value: '1,234', icon: Database, color: 'primary' },
  { label: 'Storage Used', value: '12.4 TB', icon: HardDrive, color: 'warning' },
  { label: 'Success Rate', value: '99.8%', icon: CheckCircle, color: 'success' },
  { label: 'Last Backup', value: '2h ago', icon: Clock, color: 'primary' },
];

const schedules = [
  { name: 'Daily Full Backup', frequency: 'Daily at 2:00 AM', status: 'Active', nextRun: '2026-05-01 02:00' },
  { name: 'Hourly Incremental', frequency: 'Every hour', status: 'Active', nextRun: '2026-04-30 16:00' },
  { name: 'Weekly Archive', frequency: 'Sunday at 1:00 AM', status: 'Active', nextRun: '2026-05-04 01:00' },
  { name: 'Monthly Compliance', frequency: '1st of month', status: 'Active', nextRun: '2026-05-01 00:00' },
];

const recoveryPoints = [
  { timestamp: '2026-04-30 14:00', type: 'Application Consistent', size: '245 GB', verified: true },
  { timestamp: '2026-04-30 06:00', type: 'Crash Consistent', size: '242 GB', verified: true },
  { timestamp: '2026-04-29 14:00', type: 'Application Consistent', size: '238 GB', verified: true },
  { timestamp: '2026-04-28 14:00', type: 'Application Consistent', size: '235 GB', verified: true },
];

export function BackupRecovery() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Backup recovery'}</h1>
              <p className="text-muted-foreground">
                {'Managedatabacku'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <RotateCw className="w-4 h-4 mr-2" />
                {'Refresh'}</Button>
              <Button>
                <Play className="w-4 h-4 mr-2" />
                {'Run backup now'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {backupStats.map((stat, index) => (
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {'Recent backups'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{backup.name}</h4>
                            <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                              {backup.type}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="text-xs block">{'Date'}</span>
                              <span className="text-foreground">{backup.date}</span>
                            </div>
                            <div>
                              <span className="text-xs block">{'Duration'}</span>
                              <span className="text-foreground">{backup.duration}</span>
                            </div>
                            <div>
                              <span className="text-xs block">{'Size'}</span>
                              <span className="text-foreground">{backup.size}</span>
                            </div>
                            <div>
                              <span className="text-xs block">{'Retention'}</span>
                              <span className="text-foreground">{backup.retention}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            backup.status === 'Completed' ? 'bg-success/20 text-success' :
                            backup.status === 'In Progress' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {backup.status}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Upload className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {'Backup schedules'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-input-background/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{schedule.name}</h4>
                        <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">
                          {schedule.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{schedule.frequency}</p>
                      <p className="text-xs text-muted-foreground">{'Next'}{schedule.nextRun}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  {'Manage schedules'}</Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Recovery points'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recoveryPoints.map((point, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="font-medium text-sm">{point.timestamp}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{point.size}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{point.type}</span>
                        <span className="text-success">{'Verified'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  {'Restorefrom back'}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Disaster recover'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {'Recovery time obj'}</h4>
                    <p className="text-2xl font-bold mb-1">{t('4hours_730')}</p>
                    <p className="text-sm text-muted-foreground">{'Targettimeforsy'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      {'Recovery point ob'}</h4>
                    <p className="text-2xl font-bold mb-1">{t('1hour_733')}</p>
                    <p className="text-sm text-muted-foreground">{'Maximumacceptab'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {'Last drtest'}</h4>
                    <p className="text-lg font-semibold mb-1">{t('March152026_736')}</p>
                    <p className="text-sm text-muted-foreground">{'Result successfu'}</p>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      {'Run drtest'}</Button>
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
