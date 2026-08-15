'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Search,
  FileText,
  Download,
  Filter,
  Database,
  HardDrive,
  Cpu,
  Network,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const investigations = [
  { id: 'FOR-2024-012', title: 'Data Exfiltration Analysis', type: 'Network', status: 'Active', investigator: 'Sarah Chen', started: '2026-04-30', evidence: 127, findings: 15 },
  { id: 'FOR-2024-011', title: 'Malware Origin Trace', type: 'System', status: 'Completed', investigator: 'Michael Rodriguez', started: '2026-04-28', evidence: 89, findings: 8 },
  { id: 'FOR-2024-010', title: 'Unauthorized Access Investigation', type: 'Database', status: 'Active', investigator: 'Emily Thompson', started: '2026-04-27', evidence: 156, findings: 23 },
  { id: 'FOR-2024-009', title: 'Insider Threat Analysis', type: 'User Activity', status: 'On Hold', investigator: 'David Kim', started: '2026-04-25', evidence: 234, findings: 34 },
];

const evidenceTypes = [
  { type: 'Network Logs', count: 45, size: '2.3 GB', icon: Network },
  { type: 'System Logs', count: 89, size: '1.7 GB', icon: Cpu },
  { type: 'Database Dumps', count: 12, size: '4.1 GB', icon: Database },
  { type: 'Disk Images', count: 5, size: '12.8 GB', icon: HardDrive },
];

const recentFindings = [
  { title: 'Suspicious Outbound Traffic', severity: 'high', timestamp: '2026-04-30 14:25', investigation: 'FOR-2024-012', description: 'Large data transfer to unknown IP address' },
  { title: 'Modified System Files', severity: 'critical', timestamp: '2026-04-30 12:15', investigation: 'FOR-2024-011', description: 'Critical system files altered by unknown process' },
  { title: 'Unusual Database Query', severity: 'medium', timestamp: '2026-04-30 10:30', investigation: 'FOR-2024-010', description: 'Bulk data extraction detected' },
  { title: 'After-Hours Access', severity: 'medium', timestamp: '2026-04-29 22:45', investigation: 'FOR-2024-009', description: 'User accessed sensitive files outside business hours' },
];

export function Forensics() {
  const { t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredInvestigations = investigations.filter(inv => 
    filterStatus === 'all' || inv.status.toLowerCase() === filterStatus.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Digital forensic'}</h1>
              <p className="text-muted-foreground">
                {'Investigatesecu'}</p>
            </div>
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                <option className="bg-[#0f172a]" value="all">All Statuses</option>
                <option className="bg-[#0f172a]" value="active">Active</option>
                <option className="bg-[#0f172a]" value="completed">Completed</option>
                <option className="bg-[#0f172a]" value="on hold">On Hold</option>
              </select>
              <Button>
                <Search className="w-4 h-4 mr-2" />
                {'New investigatio'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {evidenceTypes.map((evidence, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <evidence.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{evidence.type}</p>
                    <h3 className="text-2xl font-semibold">{evidence.count}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{evidence.size}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {'Active investiga'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredInvestigations.map((investigation) => (
                    <div
                      key={investigation.id}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{investigation.id}</h4>
                            <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                              {investigation.type}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{investigation.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{'Investigator'}{investigation.investigator}</span>
                            <span>{'Started'}{investigation.started}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <span className={`text-xs px-2 py-1 rounded inline-block mb-2 ${
                            investigation.status === 'Active' ? 'bg-success/20 text-success' :
                            investigation.status === 'Completed' ? 'bg-primary/20 text-primary' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {investigation.status}
                          </span>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>{investigation.evidence} {'Evidenceitems'}</p>
                            <p>{investigation.findings} {'Findings'}</p>
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
                <CardTitle>{'Recent findings'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentFindings.map((finding, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          finding.severity === 'critical' ? 'bg-destructive' :
                          finding.severity === 'high' ? 'bg-warning' :
                          'bg-primary'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{finding.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{finding.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{finding.investigation}</span>
                            <span>{finding.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {'Evidence chainof'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium mb-1">{t('networkcapture2_864')}</h4>
                        <p className="text-sm text-muted-foreground">{'Network traffic c'}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{'Collectedby'}</span>
                        <span className="text-foreground">{'Sarah chen'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{'Date'}</span>
                        <span className="text-foreground">2026-04-30 14:00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('HashSHA256_869')}</span>
                        <span className="text-foreground font-mono">{t('a3f59c2d_870')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{'Status'}</span>
                        <span className="text-success">{'Verified'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium mb-1">{'Systemmemorydum'}</h4>
                        <p className="text-sm text-muted-foreground">{'Memory image'}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{'Collectedby'}</span>
                        <span className="text-foreground">{'Michael rodrigue'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{'Date'}</span>
                        <span className="text-foreground">2026-04-28 09:30</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('HashSHA256_878')}</span>
                        <span className="text-foreground font-mono">{t('b8e24f1a_879')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{'Status'}</span>
                        <span className="text-success">{'Verified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Forensic tools'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer">
                    <h4 className="font-medium mb-2">{'Network packet an'}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{'Analyzenetworkt'}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      {'Launch tool'}</Button>
                  </div>
                  <div className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer">
                    <h4 className="font-medium mb-2">{'Memory forensics'}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{'Extractandanaly'}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      {'Launch tool'}</Button>
                  </div>
                  <div className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer">
                    <h4 className="font-medium mb-2">{'Disk image analyz'}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{'Examinediskimag'}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      {'Launch tool'}</Button>
                  </div>
                  <div className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer">
                    <h4 className="font-medium mb-2">{'Log file correlat'}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{'Correlateevents'}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      {'Launch tool'}</Button>
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
