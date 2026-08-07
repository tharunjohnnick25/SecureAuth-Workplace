'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Calendar,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const complianceFrameworks = [
  { name: 'SOC 2 Type II', status: 'Compliant', score: 98, lastAudit: '2026-03-15', nextAudit: '2026-09-15' },
  { name: 'ISO 27001', status: 'Compliant', score: 96, lastAudit: '2026-02-20', nextAudit: '2027-02-20' },
  { name: 'GDPR', status: 'Compliant', score: 94, lastAudit: '2026-01-10', nextAudit: '2026-07-10' },
  { name: 'HIPAA', status: 'Partial', score: 87, lastAudit: '2026-04-01', nextAudit: '2026-10-01' },
  { name: 'PCI DSS', status: 'Non-Compliant', score: 72, lastAudit: '2026-03-28', nextAudit: '2026-06-28' },
];

const recentReports = [
  { title: 'Q1 2026 SOC 2 Audit Report', framework: 'SOC 2', date: '2026-03-31', status: 'Completed', findings: 2 },
  { title: 'ISO 27001 Annual Review', framework: 'ISO 27001', date: '2026-02-28', status: 'Completed', findings: 5 },
  { title: 'GDPR Data Protection Assessment', framework: 'GDPR', date: '2026-01-31', status: 'Completed', findings: 3 },
  { title: 'HIPAA Security Assessment', framework: 'HIPAA', date: '2026-04-15', status: 'In Progress', findings: 12 },
];

const controlCategories = [
  { category: 'Access Control', total: 45, passed: 42, failed: 3, percentage: 93 },
  { category: 'Data Protection', total: 38, passed: 36, failed: 2, percentage: 95 },
  { category: 'Network Security', total: 52, passed: 48, failed: 4, percentage: 92 },
  { category: 'Incident Response', total: 28, passed: 25, failed: 3, percentage: 89 },
  { category: 'Business Continuity', total: 35, passed: 30, failed: 5, percentage: 86 },
];

export function ComplianceReports() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Compliance repor'}</h1>
              <p className="text-muted-foreground">
                {'Monitorcomplian'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                {'Schedule report'}</Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                {'Export all'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Compliant'}</p>
                  <h3 className="text-2xl font-semibold">3</h3>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    {t('1thismonth_750')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Partial'}</p>
                  <h3 className="text-2xl font-semibold">1</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Needsattention'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Non compliant'}</p>
                  <h3 className="text-2xl font-semibold">1</h3>
                  <p className="text-xs text-destructive mt-1">{'Critical'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Avg score'}</p>
                  <h3 className="text-2xl font-semibold">89%</h3>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    {t('3improvement_756')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {'Compliance frame'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceFrameworks.map((framework, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            framework.status === 'Compliant' ? 'bg-success/20' :
                            framework.status === 'Partial' ? 'bg-warning/20' : 'bg-destructive/20'
                          }`}>
                            {framework.status === 'Compliant' ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : framework.status === 'Partial' ? (
                              <AlertTriangle className="w-5 h-5 text-warning" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{framework.name}</h4>
                            <p className="text-sm text-muted-foreground">{framework.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold">{framework.score}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-input-background rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full ${
                            framework.score >= 90 ? 'bg-success' :
                            framework.score >= 70 ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${framework.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{'Last audit'}{framework.lastAudit}</span>
                        <span>{'Next'}{framework.nextAudit}</span>
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
                  {'Recent reports'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium mb-1">{report.title}</h4>
                          <p className="text-sm text-muted-foreground">{report.framework}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{report.date}</span>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            report.status === 'Completed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          }`}>
                            {report.status}
                          </span>
                          <span className="text-muted-foreground">{report.findings} {'Findings'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {'Control categori'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {controlCategories.map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{category.category}</h4>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-success">{category.passed} {'Passed'}</span>
                        <span className="text-destructive">{category.failed} {'Failed'}</span>
                        <span className="font-semibold">{category.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-input-background rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          category.percentage >= 90 ? 'bg-success' : 'bg-warning'
                        }`}
                        style={{ width: `${category.percentage}%` }}
                      />
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
