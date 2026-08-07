'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { FileText, Plus, Calendar, TrendingUp } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const reports = [
  { name: 'Security Summary', type: 'Executive', lastGenerated: '2026-04-30', schedule: 'Weekly' },
  { name: 'Compliance Status', type: 'Compliance', lastGenerated: '2026-04-29', schedule: 'Monthly' },
  { name: 'Vulnerability Report', type: 'Technical', lastGenerated: '2026-04-30', schedule: 'Daily' },
  { name: 'Incident Analysis', type: 'Security', lastGenerated: '2026-04-28', schedule: 'As Needed' },
];

export function ReportsDashboard() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Reports dashboar'}</h1>
              <p className="text-muted-foreground">{'Overviewofgener'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'New report'}</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {'Available report'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.map((report, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{report.name}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">{report.type}</span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{'Last'}{report.lastGenerated}</span>
                          <span>{'Schedule'}{report.schedule}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">{'View report'}</Button>
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
