'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Calendar, Plus, Clock } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const schedules = [
  { report: 'Security Summary', frequency: 'Weekly - Monday 9:00 AM', recipients: ['security@company.com'], nextRun: '2026-05-05 09:00', status: 'Active' },
  { report: 'Compliance Report', frequency: 'Monthly - 1st at 8:00 AM', recipients: ['compliance@company.com', 'audit@company.com'], nextRun: '2026-05-01 08:00', status: 'Active' },
  { report: 'Daily Threat Digest', frequency: 'Daily at 7:00 AM', recipients: ['security@company.com'], nextRun: '2026-05-01 07:00', status: 'Active' },
];

export function ScheduledReports() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Scheduled report'}</h1>
              <p className="text-muted-foreground">{'Automatereportg'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'New schedule'}</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {'Report schedules'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map((schedule, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{schedule.report}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">{schedule.status}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{schedule.frequency}</span>
                          </div>
                          <p>{'Recipients'}{schedule.recipients.join(', ')}</p>
                          <p>{'Nextrun'}{schedule.nextRun}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">{'Edit schedule'}</Button>
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
