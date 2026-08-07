'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Key, CheckCircle, Settings } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const ssoProviders = [
  { name: 'Google Workspace', status: 'Connected', users: 187, protocol: 'SAML 2.0' },
  { name: 'Microsoft Azure AD', status: 'Connected', users: 92, protocol: 'OIDC' },
  { name: 'Okta', status: 'Available', users: 0, protocol: 'SAML 2.0' },
  { name: 'Auth0', status: 'Available', users: 0, protocol: 'OIDC' },
];

export function SsoConfiguration() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Ssoconfiguratio'}</h1>
            <p className="text-muted-foreground">{'Configure single'}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {'Ssoproviders'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ssoProviders.map((provider, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-input-background/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{provider.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            provider.status === 'Connected' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                          }`}>
                            {provider.status}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{'Protocol'}{provider.protocol}</span>
                          {provider.users > 0 && <span>{provider.users} {'Users'}</span>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        {provider.status === 'Connected' ? 'Configure' : 'Connect'}
                      </Button>
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
