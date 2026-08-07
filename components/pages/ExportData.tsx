'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Download, FileText, Database, Calendar } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const exportOptions = [
  { name: 'Security Events', description: 'Export all security events and alerts', format: 'CSV, JSON, PDF' },
  { name: 'Audit Logs', description: 'Export complete audit trail', format: 'CSV, JSON' },
  { name: 'User Data', description: 'Export user accounts and permissions', format: 'CSV, JSON' },
  { name: 'Compliance Reports', description: 'Export compliance assessment data', format: 'PDF, XLSX' },
];

export function ExportData() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Export data'}</h1>
            <p className="text-muted-foreground">{'Export your data in multiple formats for analysis and compliance'}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                {'Export options'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportOptions.map((option, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{option.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                        <p className="text-xs text-muted-foreground">{'Available formats: '}{option.format}</p>
                      </div>
                      <Button>
                        <Download className="w-4 h-4 mr-2" />
                        {'Export'}</Button>
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
