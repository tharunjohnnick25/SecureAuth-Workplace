'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Shield,
  Smartphone,
  Key,
  Mail,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  QrCode,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

export function MfaSettings() {
    const { t } = useLanguage();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnabledCount, setMfaEnabledCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setMfaFactors(factors?.all || []);

      const { count: enabled } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_mfa_enabled', true);
      setMfaEnabledCount(enabled || 0);

      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(total || 1);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const unenrollMfa = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('MFA factor removed');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const enrolledPercent = totalUsers > 0 ? Math.round((mfaEnabledCount / totalUsers) * 100) : 0;

  const mfaMethods = [
    { name: 'Authenticator App', icon: Smartphone, enabled: mfaFactors.length > 0, users: mfaEnabledCount, description: 'TOTP-based authentication using apps like Google Authenticator', recommended: true },
    { name: 'SMS Verification', icon: Mail, enabled: false, users: 0, description: 'One-time codes sent via SMS', recommended: false },
    { name: 'Email Verification', icon: Mail, enabled: false, users: 0, description: 'Verification codes sent to email', recommended: false },
    { name: 'Hardware Token', icon: Key, enabled: false, users: 0, description: 'Physical security keys (YubiKey, etc.)', recommended: true },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Multi factor auth'}</h1>
              <p className="text-muted-foreground">
                {'Configure and manage MFA settings for your account'}</p>
            </div>
            <Button onClick={() => window.location.href = '/mfa-setup'}>
              <Shield className="w-4 h-4 mr-2" />
              {mfaFactors.length > 0 ? 'Manage MFA' : 'Enable MFA'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Enrolled'}</p>
                  <h3 className="text-2xl font-semibold">{enrolledPercent}%</h3>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    {'of users'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Authenticator'}</p>
                  <h3 className="text-2xl font-semibold">{mfaEnabledCount}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'With totp'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Total users'}</p>
                  <h3 className="text-2xl font-semibold">{totalUsers}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{'Registered'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{'Not enrolled'}</p>
                  <h3 className="text-2xl font-semibold">{totalUsers - mfaEnabledCount}</h3>
                  <p className="text-xs text-destructive mt-1">{'Needs setup'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  {'Available MFA methods'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mfaMethods.map((method, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <method.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{method.name}</h4>
                              {method.recommended && (
                                <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success">
                                  {'Recommended'}</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{method.users} {'Users enrolled'}</span>
                            </div>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked={method.enabled}
                            disabled
                          />
                          <div className="w-11 h-6 bg-input-background rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Your MFA status'}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mfaFactors.length === 0 ? (
                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {'MFA not enabled'}</h4>
                        <p className="text-xs text-muted-foreground">
                          {"You haven't set up MFA yet"}</p>
                        <Button size="sm" className="mt-3" onClick={() => window.location.href = '/mfa-setup'}>
                          {'Enable MFA'}</Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mfaFactors.map((factor: any) => (
                          <div key={factor.id} className="p-3 rounded-lg bg-input-background/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{factor.friendly_name || factor.factor_type}</span>
                              </div>
                              <span className="text-xs text-success">{'Active'}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unenrollMfa(factor.id)}
                              className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                            >
                              {'Remove'}</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
