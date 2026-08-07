'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Bell, Plus, Settings } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const rules = [
  { name: 'Critical Security Events', channels: ['Email', 'SMS', 'Slack'], status: 'Active', priority: 'High' },
  { name: 'Failed Login Attempts', channels: ['Email'], status: 'Active', priority: 'Medium' },
  { name: 'System Updates', channels: ['Email'], status: 'Active', priority: 'Low' },
  { name: 'Compliance Violations', channels: ['Email', 'Slack'], status: 'Active', priority: 'High' },
];

export function NotificationRules() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Notification rules'}</h1>
              <p className="text-muted-foreground">{'Configure notification rules and alert channels'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'New rule'}</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {'Notification rules'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.map((rule, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{rule.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          rule.priority === 'High' ? 'bg-destructive/20 text-destructive' :
                          rule.priority === 'Medium' ? 'bg-warning/20 text-warning' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {rule.priority}
                        </span>
                        <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {rule.channels.map((channel, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-primary/10">{channel}</span>
                      ))}
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
