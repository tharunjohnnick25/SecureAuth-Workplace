'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Mail, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const templates = [
  { id: '1', name: 'Security Alert', subject: 'Security Alert: {{threat_type}}', category: 'Alerts', lastModified: '2026-04-28', usage: 245 },
  { id: '2', name: 'Password Reset', subject: 'Reset Your Password', category: 'Authentication', lastModified: '2026-04-25', usage: 892 },
  { id: '3', name: 'New Device Login', subject: 'New Device Detected', category: 'Notifications', lastModified: '2026-04-20', usage: 567 },
  { id: '4', name: 'Weekly Report', subject: 'Weekly Security Summary', category: 'Reports', lastModified: '2026-04-15', usage: 48 },
];

export function EmailTemplates() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Email templates'}</h1>
              <p className="text-muted-foreground">{'Manage email notifications and automated messages'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'New template'}</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {'Email templates'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{'Category: '}{template.category}</span>
                          <span>{'Last modified: '}{template.lastModified}</span>
                          <span>{'Used: '}{template.usage} {'Times'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm"><Edit className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
