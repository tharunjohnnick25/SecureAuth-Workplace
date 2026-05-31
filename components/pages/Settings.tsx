'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Shield, Bell, Lock, User, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface UserSettings {
  full_name: string;
  email: string;
  phone: string;
  mfa_enabled: boolean;
  biometric_enabled: boolean;
  risk_based_auth: boolean;
  security_alerts: boolean;
  new_device_alerts: boolean;
  employee_id?: string;
  department?: string;
}

export function Settings() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({
    full_name: '',
    email: '',
    phone: '',
    mfa_enabled: false,
    biometric_enabled: false,
    risk_based_auth: true,
    security_alerts: true,
    new_device_alerts: true,
  });
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setFetching(true);
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (profile) {
        const p = profile as any;
        setSettings({
          full_name: p.full_name || '',
          email: p.email || user?.email || '',
          phone: p.phone || '',
          mfa_enabled: p.is_mfa_enabled || p.mfa_enabled || false,
          biometric_enabled: p.biometric_enabled || false,
          risk_based_auth: p.risk_based_auth !== false,
          security_alerts: p.security_alerts !== false,
          new_device_alerts: p.new_device_alerts !== false,
        });
      }
    } catch {
      // Use defaults
    } finally {
      setFetching(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase.from('users') as any)
        .update({
          full_name: settings.full_name,
          phone: settings.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setUser({ ...user!, first_name: settings.full_name.split(' ')[0] || '', last_name: settings.full_name.split(' ').slice(1).join(' ') || '' });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase.from('users') as any)
        .update({
          biometric_enabled: settings.biometric_enabled,
          risk_based_auth: settings.risk_based_auth,
          security_alerts: settings.security_alerts,
          new_device_alerts: settings.new_device_alerts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Security settings updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <Sidebar />
        <div className="lg:ml-64 transition-all duration-300">
          <Navbar />
          <main className="pt-24 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and security preferences
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Profile Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm">Full Name</label>
                    <Input
                      value={settings.full_name}
                      onChange={(e) => setSettings({ ...settings, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Email Address</label>
                    <Input value={settings.email} disabled />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Phone Number</label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Role</label>
                    <Input value={(user?.role || 'Employee')} disabled />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={saveProfile} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <CardTitle>Security Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-input-background/30">
                    <div>
                      <h4 className="font-medium mb-1">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${settings.mfa_enabled ? 'text-success' : 'text-muted-foreground'}`}>
                        {settings.mfa_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => window.location.href = settings.mfa_enabled ? '/mfa-settings' : '/mfa-setup'}
                        className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${settings.mfa_enabled ? 'bg-success' : 'bg-muted'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.mfa_enabled ? 'ml-auto' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-input-background/30">
                    <div>
                      <h4 className="font-medium mb-1">Biometric Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Use fingerprint or face recognition
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${settings.biometric_enabled ? 'text-success' : 'text-muted-foreground'}`}>
                        {settings.biometric_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => toggleSetting('biometric_enabled')}
                        className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${settings.biometric_enabled ? 'bg-success' : 'bg-muted'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.biometric_enabled ? 'ml-auto' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-input-background/30">
                    <div>
                      <h4 className="font-medium mb-1">Risk-Based Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically adjust security based on login context
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${settings.risk_based_auth ? 'text-success' : 'text-muted-foreground'}`}>
                        {settings.risk_based_auth ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => toggleSetting('risk_based_auth')}
                        className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${settings.risk_based_auth ? 'bg-success' : 'bg-muted'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.risk_based_auth ? 'ml-auto' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={saveSecuritySettings} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Security Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-warning" />
                  </div>
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-input-background/30">
                    <div>
                      <h4 className="font-medium mb-1">Security Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified about suspicious activity
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSetting('security_alerts')}
                      className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${settings.security_alerts ? 'bg-success' : 'bg-muted'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.security_alerts ? 'ml-auto' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-input-background/30">
                    <div>
                      <h4 className="font-medium mb-1">New Device Login</h4>
                      <p className="text-sm text-muted-foreground">
                        Alert when a new device accesses your account
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSetting('new_device_alerts')}
                      className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${settings.new_device_alerts ? 'bg-success' : 'bg-muted'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.new_device_alerts ? 'ml-auto' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={saveSecuritySettings} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notification Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-destructive" />
                  </div>
                  <CardTitle>Change Password</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={passwords.newPass}
                      onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={updatePassword} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                    </Button>
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
