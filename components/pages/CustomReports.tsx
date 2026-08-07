'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { FileText, Plus, Settings } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const customReports = [
  { name: 'Top 10 Security Threats', metrics: ['Threat Type', 'Severity', 'Count'], filters: 'Last 30 days', created: '2026-04-15' },
  { name: 'User Activity Summary', metrics: ['Login Count', 'Failed Attempts', 'Locations'], filters: 'All users', created: '2026-04-10' },
  { name: 'Compliance Gaps', metrics: ['Framework', 'Status', 'Action Required'], filters: 'All frameworks', created: '2026-03-28' },
];

export function CustomReports() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Custom reports'}</h1>
              <p className="text-muted-foreground">{'Buildandmanagec'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'Create custom rep'}</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {'Your custom repor'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customReports.map((report, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{report.name}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{'Metrics'}{report.metrics.join(', ')}</p>
                          <p>{'Filters'}{report.filters}</p>
                          <p>{'Created'}{report.created}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
                        <Button size="sm">{'Run report'}</Button>
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
