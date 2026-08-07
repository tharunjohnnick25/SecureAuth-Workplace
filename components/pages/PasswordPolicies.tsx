'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Key,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const policySettings = [
  { name: 'Minimum Length', value: '12 characters', enabled: true, compliance: 'SOC 2' },
  { name: 'Complexity Requirements', value: 'Upper, lower, numbers, symbols', enabled: true, compliance: 'ISO 27001' },
  { name: 'Password History', value: 'Last 10 passwords', enabled: true, compliance: 'NIST' },
  { name: 'Maximum Age', value: '90 days', enabled: true, compliance: 'PCI DSS' },
  { name: 'Minimum Age', value: '24 hours', enabled: true, compliance: 'HIPAA' },
  { name: 'Dictionary Check', value: 'Common passwords blocked', enabled: true, compliance: 'NIST' },
  { name: 'Breach Detection', value: 'Check against known breaches', enabled: true, compliance: 'Best Practice' },
  { name: 'Lockout Threshold', value: '5 failed attempts', enabled: true, compliance: 'SOC 2' },
];

const policyStats = [
  { label: 'Compliant Users', value: '87%', icon: CheckCircle, color: 'success', trend: '+3%' },
  { label: 'Weak Passwords', value: '23', icon: AlertTriangle, color: 'warning', trend: '-12' },
  { label: 'Expired Passwords', value: '15', icon: Clock, color: 'destructive', trend: '-5' },
  { label: 'Policy Violations', value: '8', icon: XCircle, color: 'destructive', trend: '-3' },
];

const userCompliance = [
  { user: 'sarah.chen@company.com', status: 'Compliant', lastChange: '45 days ago', strength: 'Strong', expires: '45 days' },
  { user: 'michael.r@company.com', status: 'Compliant', lastChange: '20 days ago', strength: 'Strong', expires: '70 days' },
  { user: 'emily.t@company.com', status: 'Weak Password', lastChange: '120 days ago', strength: 'Weak', expires: 'Expired' },
  { user: 'david.kim@company.com', status: 'Compliant', lastChange: '10 days ago', strength: 'Strong', expires: '80 days' },
  { user: 'lisa.a@company.com', status: 'Expired', lastChange: '95 days ago', strength: 'Medium', expires: 'Expired' },
];

const strengthDistribution = [
  { level: 'Strong', count: 156, percentage: 68, color: 'success' },
  { level: 'Medium', count: 52, percentage: 23, color: 'warning' },
  { level: 'Weak', count: 21, percentage: 9, color: 'destructive' },
];

export function PasswordPolicies() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Password policie'}</h1>
              <p className="text-muted-foreground">
                {'Configureandenf'}</p>
            </div>
            <Button>
              <Shield className="w-4 h-4 mr-2" />
              {'Save changes'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {policyStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${stat.color}/20 flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-semibold">{stat.value}</h3>
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      {stat.trend}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  {'Policy configura'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policySettings.map((policy, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{policy.name}</h4>
                          <p className="text-sm text-muted-foreground">{policy.value}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                            {policy.compliance}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              defaultChecked={policy.enabled}
                            />
                            <div className="w-11 h-6 bg-input-background rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Password strengt'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strengthDistribution.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{item.level}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{item.count} {'Users'}</span>
                          <span className={`text-sm font-semibold text-${item.color}`}>{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-input-background rounded-full h-2">
                        <div
                          className={`bg-${item.color} h-2 rounded-full`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h4 className="text-sm font-medium mb-2">{'Overall score'}</h4>
                  <div className="text-4xl font-bold text-primary mb-1">8.2/10</div>
                  <p className="text-xs text-muted-foreground">{'Goodpasswordsec'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{'User compliance s'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium">{'User'}</th>
                      <th className="text-left p-3 font-medium">{'Status'}</th>
                      <th className="text-left p-3 font-medium">{'Strength'}</th>
                      <th className="text-left p-3 font-medium">{'Last changed'}</th>
                      <th className="text-left p-3 font-medium">{'Expires in'}</th>
                      <th className="text-right p-3 font-medium">{'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userCompliance.map((user, index) => (
                      <tr key={index} className="border-b border-border hover:bg-input-background/30">
                        <td className="p-3 text-sm">{user.user}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            user.status === 'Compliant' ? 'bg-success/20 text-success' :
                            user.status === 'Weak Password' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            user.strength === 'Strong' ? 'bg-success/20 text-success' :
                            user.strength === 'Medium' ? 'bg-warning/20 text-warning' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {user.strength}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{user.lastChange}</td>
                        <td className="p-3 text-sm">
                          <span className={user.expires === 'Expired' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            {user.expires}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm">
                            {'Force reset'}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{'Recommended best'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{'Implement mfa'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {'Multifactorauth'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{'Regular audits'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {'Conductperiodic'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{'Password manager'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {'Encourageuseofe'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{'Breach monitorin'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {'Monitorforcompr'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
