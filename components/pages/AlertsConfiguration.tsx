'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Bell, Plus, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const alertRules = [
  { id: '1', name: 'High CPU Usage', condition: 'CPU > 80% for 5 minutes', severity: 'critical', status: 'Active', notifications: ['Email', 'Slack'] },
  { id: '2', name: 'Failed Login Attempts', condition: '> 5 failed logins in 10 minutes', severity: 'high', status: 'Active', notifications: ['Email'] },
  { id: '3', name: 'Disk Space Low', condition: 'Disk usage > 90%', severity: 'warning', status: 'Active', notifications: ['Email', 'SMS'] },
  { id: '4', name: 'API Error Rate', condition: 'Error rate > 1%', severity: 'high', status: 'Active', notifications: ['Slack'] },
];

const stats = [
  { label: 'Active Rules', value: '24', icon: Bell, color: 'primary' },
  { label: 'Triggered Today', value: '156', icon: AlertTriangle, color: 'warning' },
  { label: 'Resolved', value: '142', icon: CheckCircle, color: 'success' },
];

export function AlertsConfiguration() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Alert configurat'}</h1>
              <p className="text-muted-foreground">{'Configurealerti'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'New alert rule'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {stats.map((stat, index) => (
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

          <Card>
            <CardHeader>
              <CardTitle>{'Alert rules'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            rule.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                            rule.severity === 'high' ? 'bg-warning/20 text-warning' :
                            'bg-primary/20 text-primary'
                          }`}>
                            {rule.severity}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">
                            {rule.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rule.condition}</p>
                        <div className="flex gap-2">
                          {rule.notifications.map((notif, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded bg-primary/10">
                              {notif}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
