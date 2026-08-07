'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from "@/context/LanguageContext";

const apiKeys = [
  { id: '1', name: 'Production API Key', key: 'sk_prod_abc123...xyz789', created: '2026-01-15', lastUsed: '2 hours ago', status: 'Active', requests: '1.2M' },
  { id: '2', name: 'Development API Key', key: 'sk_dev_def456...uvw012', created: '2026-02-20', lastUsed: '5 minutes ago', status: 'Active', requests: '458K' },
  { id: '3', name: 'Testing API Key', key: 'sk_test_ghi789...rst345', created: '2026-03-10', lastUsed: '1 day ago', status: 'Active', requests: '89K' },
  { id: '4', name: 'Legacy API Key', key: 'sk_prod_jkl012...opq678', created: '2025-11-05', lastUsed: '30 days ago', status: 'Inactive', requests: '2.8M' },
];

const usageStats = [
  { period: 'Today', requests: 15234, success: 15102, failed: 132 },
  { period: 'This Week', requests: 89567, success: 88934, failed: 633 },
  { period: 'This Month', requests: 342891, success: 340125, failed: 2766 },
];

export function ApiKeys() {
    const { t } = useLanguage();
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Apikeys'}</h1>
              <p className="text-muted-foreground">
                {'Manageyour apike'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'Create new key'}</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Key className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Total keys'}</p>
                  <h3 className="text-2xl font-semibold">{apiKeys.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('3active1inactiv_663')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Requests today'}</p>
                  <h3 className="text-2xl font-semibold">{t('152K_665')}</h3>
                  <p className="text-xs text-success mt-1">{t('991successrate_666')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Rate limit'}</p>
                  <h3 className="text-2xl font-semibold">72%</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Ofmonthlyquota'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {'Your apikeys'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{apiKey.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            apiKey.status === 'Active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                          }`}>
                            {apiKey.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <code className="text-sm bg-background/50 px-3 py-1 rounded font-mono">
                            {showKeys[apiKey.id] ? apiKey.key : apiKey.key.replace(/[a-z0-9]/gi, '•')}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="p-1 hover:bg-input-background rounded"
                          >
                            {showKeys[apiKey.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button className="p-1 hover:bg-input-background rounded">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="text-xs">{'Created'}</span>
                            <p className="font-medium text-foreground">{apiKey.created}</p>
                          </div>
                          <div>
                            <span className="text-xs">{'Last used'}</span>
                            <p className="font-medium text-foreground">{apiKey.lastUsed}</p>
                          </div>
                          <div>
                            <span className="text-xs">{'Total requests'}</span>
                            <p className="font-medium text-foreground">{apiKey.requests}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Activity className="w-4 h-4 mr-2" />
                          {'View usage'}</Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {'Usage statistics'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageStats.map((stat, index) => (
                    <div key={index} className="p-4 rounded-lg bg-input-background/30">
                      <h4 className="font-medium mb-3">{stat.period}</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">{'Total'}</p>
                          <p className="text-xl font-semibold">{stat.requests.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">{'Success'}</p>
                          <p className="text-xl font-semibold text-success">{stat.success.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">{'Failed'}</p>
                          <p className="text-xl font-semibold text-destructive">{stat.failed.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{'Success rate'}</span>
                          <span>{((stat.success / stat.requests) * 100).toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-input-background rounded-full h-2">
                          <div
                            className="bg-success h-2 rounded-full"
                            style={{ width: `${(stat.success / stat.requests) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {'Security best pra'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      {'Keep your keys sec'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {'Nevershareyour a'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {'Rotate regularly'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {'Rotateyour apike'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {'Monitor usage'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {'Regularlyreview'}</p>
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
