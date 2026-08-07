'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Activity,
  Users,
  FileText,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const incidents = [
  { id: 'INC-2024-089', title: 'Ransomware Attack Detected', severity: 'critical', status: 'Active', assignee: 'Sarah Chen', created: '2026-04-30 14:35', updated: '5 min ago', priority: 'P1' },
  { id: 'INC-2024-088', title: 'Unauthorized Data Access', severity: 'high', status: 'Investigating', assignee: 'Michael Rodriguez', created: '2026-04-30 12:20', updated: '2 hours ago', priority: 'P2' },
  { id: 'INC-2024-087', title: 'DDoS Attack Mitigated', severity: 'high', status: 'Resolved', assignee: 'Emily Thompson', created: '2026-04-30 08:15', updated: '6 hours ago', priority: 'P2' },
  { id: 'INC-2024-086', title: 'Phishing Campaign Detected', severity: 'medium', status: 'Monitoring', assignee: 'David Kim', created: '2026-04-29 18:45', updated: '1 day ago', priority: 'P3' },
  { id: 'INC-2024-085', title: 'Malware Outbreak', severity: 'high', status: 'Resolved', assignee: 'Lisa Anderson', created: '2026-04-29 14:30', updated: '1 day ago', priority: 'P2' },
];

const incidentStats = [
  { label: 'Active Incidents', value: '3', icon: AlertTriangle, color: 'destructive' },
  { label: 'In Progress', value: '1', icon: Activity, color: 'warning' },
  { label: 'Resolved Today', value: '5', icon: CheckCircle, color: 'success' },
  { label: 'Avg Response Time', value: '12m', icon: Clock, color: 'primary' },
];

const responsePlaybooks = [
  { name: 'Ransomware Response', steps: 12, lastUsed: '2 hours ago', usageCount: 3 },
  { name: 'Data Breach Protocol', steps: 15, lastUsed: '1 day ago', usageCount: 7 },
  { name: 'DDoS Mitigation', steps: 8, lastUsed: '6 hours ago', usageCount: 12 },
  { name: 'Phishing Response', steps: 10, lastUsed: '1 week ago', usageCount: 23 },
];

const timeline = [
  { time: '14:35', action: 'Incident created', user: 'System', type: 'create' },
  { time: '14:37', action: 'Assigned to Sarah Chen', user: 'Auto-assignment', type: 'assign' },
  { time: '14:40', action: 'Playbook "Ransomware Response" initiated', user: 'Sarah Chen', type: 'action' },
  { time: '14:45', action: 'Affected systems isolated', user: 'Sarah Chen', type: 'action' },
  { time: '14:52', action: 'Status updated to "Containment"', user: 'Sarah Chen', type: 'update' },
];

export function IncidentResponse() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Incident respons'}</h1>
              <p className="text-muted-foreground">
                {'Manageandrespon'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'Create incident'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {incidentStats.map((stat, index) => (
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
                  <AlertTriangle className="w-5 h-5" />
                  {'Active incidents'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{incident.id}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              incident.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                              incident.severity === 'high' ? 'bg-warning/20 text-warning' :
                              'bg-primary/20 text-primary'
                            }`}>
                              {incident.severity.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                              {incident.priority}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{incident.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {incident.assignee}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {'Created'}{incident.created}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <span className={`text-xs px-2 py-1 rounded inline-block mb-2 ${
                            incident.status === 'Active' ? 'bg-destructive/20 text-destructive' :
                            incident.status === 'Investigating' ? 'bg-warning/20 text-warning' :
                            incident.status === 'Monitoring' ? 'bg-primary/20 text-primary' :
                            'bg-success/20 text-success'
                          }`}>
                            {incident.status}
                          </span>
                          <p className="text-xs text-muted-foreground">{'Updated'}{incident.updated}</p>
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
                  <FileText className="w-5 h-5" />
                  {'Response playboo'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {responsePlaybooks.map((playbook, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{playbook.name}</h4>
                        <Button variant="outline" size="sm">
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>{playbook.steps} {'Steps'}</p>
                        <p>{'Lastused'}{playbook.lastUsed}</p>
                        <p>{'Used'}{playbook.usageCount} {'Times'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {'New playbook'}</Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {'Incident timelin'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.type === 'create' ? 'bg-primary/20' :
                          event.type === 'assign' ? 'bg-warning/20' :
                          event.type === 'action' ? 'bg-success/20' :
                          'bg-muted/20'
                        }`}>
                          {event.type === 'create' && <Plus className="w-4 h-4 text-primary" />}
                          {event.type === 'assign' && <Users className="w-4 h-4 text-warning" />}
                          {event.type === 'action' && <CheckCircle className="w-4 h-4 text-success" />}
                          {event.type === 'update' && <Activity className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        {index < timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium mb-1">{event.action}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{event.user}</span>
                          <span>•</span>
                          <span>{event.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Incident metrics'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-input-background/30">
                    <h4 className="text-sm font-medium mb-3">{'Response time las'}</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{'Average'}</span>
                          <span className="font-semibold">{t('12minutes_957')}</span>
                        </div>
                        <div className="w-full bg-input-background rounded-full h-2">
                          <div className="bg-success h-2 rounded-full" style={{ width: '75%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{'Fastest'}</span>
                          <span className="font-semibold">{t('3minutes_959')}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{'Slowest'}</span>
                          <span className="font-semibold">{t('45minutes_961')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-input-background/30">
                    <h4 className="text-sm font-medium mb-3">{'Resolution rate'}</h4>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-success mb-1">94.5%</div>
                      <p className="text-sm text-muted-foreground">{'Successfullyres'}</p>
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
