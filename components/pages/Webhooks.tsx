'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  Webhook,
  Plus,
  CheckCircle,
  XCircle,
  Activity,
  Settings,
  Trash2,
  RotateCw,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const webhooks = [
  { id: '1', name: 'Security Alerts Webhook', url: 'https://api.example.com/security/alerts', events: ['security.alert', 'threat.detected'], status: 'Active', lastTrigger: '5 min ago', success: 1245, failed: 3 },
  { id: '2', name: 'User Activity Webhook', url: 'https://api.example.com/user/activity', events: ['user.login', 'user.logout'], status: 'Active', lastTrigger: '2 hours ago', success: 892, failed: 0 },
  { id: '3', name: 'Compliance Events', url: 'https://api.example.com/compliance/events', events: ['compliance.check', 'audit.log'], status: 'Active', lastTrigger: '1 day ago', success: 456, failed: 12 },
  { id: '4', name: 'Legacy Integration', url: 'https://old.example.com/webhooks', events: ['device.added'], status: 'Inactive', lastTrigger: '30 days ago', success: 2341, failed: 89 },
];

const eventTypes = [
  { name: 'security.alert', description: 'Triggered when a security alert is created' },
  { name: 'threat.detected', description: 'Triggered when a threat is detected' },
  { name: 'user.login', description: 'Triggered when a user logs in' },
  { name: 'user.logout', description: 'Triggered when a user logs out' },
  { name: 'device.added', description: 'Triggered when a device is added' },
  { name: 'compliance.check', description: 'Triggered during compliance checks' },
  { name: 'audit.log', description: 'Triggered when an audit log is created' },
];

const recentDeliveries = [
  { event: 'security.alert', status: 'Success', statusCode: 200, timestamp: '2026-04-30 14:30:15', duration: '145ms' },
  { event: 'user.login', status: 'Success', statusCode: 200, timestamp: '2026-04-30 14:28:42', duration: '98ms' },
  { event: 'threat.detected', status: 'Failed', statusCode: 500, timestamp: '2026-04-30 14:25:33', duration: '5002ms' },
  { event: 'user.logout', status: 'Success', statusCode: 200, timestamp: '2026-04-30 14:20:11', duration: '112ms' },
];

export function Webhooks() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Webhooks'}</h1>
              <p className="text-muted-foreground">
                {'Configureandmon'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'Add webhook'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Webhook className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Total webhooks'}</p>
                  <h3 className="text-2xl font-semibold">{webhooks.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('3active1inactiv_1373')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Success rate'}</p>
                  <h3 className="text-2xl font-semibold">98.7%</h3>
                  <p className="text-xs text-success mt-1">{t('Last24hours_1375')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Deliveries today'}</p>
                  <h3 className="text-2xl font-semibold">2,593</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('104failed_1377')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                {'Configured webho'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{webhook.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            webhook.status === 'Active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                          }`}>
                            {webhook.status}
                          </span>
                        </div>
                        <code className="text-sm text-muted-foreground mb-3 block">{webhook.url}</code>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {webhook.events.map((event, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                              {event}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="text-xs">{'Last trigger'}</span>
                            <p className="font-medium text-foreground">{webhook.lastTrigger}</p>
                          </div>
                          <div>
                            <span className="text-xs">{'Success'}</span>
                            <p className="font-medium text-success">{webhook.success.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-xs">{'Failed'}</span>
                            <p className="font-medium text-destructive">{webhook.failed}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <RotateCw className="w-4 h-4" />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {'Recent deliverie'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentDeliveries.map((delivery, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {delivery.status === 'Success' ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="font-medium">{delivery.event}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          delivery.status === 'Success' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        }`}>
                          {delivery.statusCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{delivery.timestamp}</span>
                        <span>{delivery.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    {'View all deliveri'}</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Available event t'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {eventTypes.map((event, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <code className="text-sm font-medium text-primary">{event.name}</code>
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
