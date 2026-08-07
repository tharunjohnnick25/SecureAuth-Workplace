'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Database, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const ldapConfig = [
  { setting: 'LDAP Server', value: 'ldap://dc.example.com:389', status: 'Connected' },
  { setting: 'Base DN', value: 'DC=example,DC=com', status: 'Valid' },
  { setting: 'Bind DN', value: 'CN=admin,DC=example,DC=com', status: 'Valid' },
  { setting: 'User Filter', value: '(&(objectClass=user)(sAMAccountName={{username}}))', status: 'Valid' },
];

export function LdapIntegration() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'LDAP integration'}</h1>
              <p className="text-muted-foreground">{'Configure LDAP connections to sync your directory users'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                {'Test connection'}</Button>
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                {'Save configuration'}</Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {'LDAP configuration'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ldapConfig.map((config, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{config.setting}</h4>
                      <span className="text-xs px-2 py-1 rounded bg-success/20 text-success flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {config.status}
                      </span>
                    </div>
                    <code className="text-sm text-muted-foreground font-mono">{config.value}</code>
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
