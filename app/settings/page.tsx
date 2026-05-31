'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Bell, Lock, Key, CreditCard, Command, Check, Trash2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { BillingSection } from '@/components/settings/BillingSection';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<'general' | 'security' | 'notifications' | 'access' | 'api' | 'billing' | 'admin'>('general');
  const [fetching, setFetching] = useState(true);

  const [generalSettings, setGeneralSettings] = useState({
    theme: 'dark',
    language: 'English',
    timezone: 'UTC-5 (EST)',
    highContrast: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    mfaRequired: true,
    minPasswordLength: 12,
    sessionTimeout: 30,
    loginProtection: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    securityNotif: true,
    smsAlerts: false,
    pushNotif: true
  });

  const [accessSettings, setAccessSettings] = useState({
    autoApprove: false,
    requireReason: true,
    defaultRole: 'Employee'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setFetching(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (data) {
        const p = data as any;
        setGeneralSettings(prev => ({
          ...prev,
          theme: p.settings_theme || prev.theme,
          timezone: p.settings_timezone || prev.timezone,
        }));
        setSecuritySettings(prev => ({
          ...prev,
          loginProtection: p.risk_based_auth !== false,
        }));
        setNotificationSettings(prev => ({
          ...prev,
          emailAlerts: p.security_alerts !== false,
          pushNotif: p.new_device_alerts !== false,
        }));
      }
    } catch {}
    setFetching(false);
  };

  const saveGeneral = async () => {
    try {
      await (supabase.from('users') as any).update({
        settings_theme: generalSettings.theme,
        settings_timezone: generalSettings.timezone,
        updated_at: new Date().toISOString(),
      }).eq('id', user?.id);
      toast.success('General settings saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveSecurity = async () => {
    try {
      await (supabase.from('users') as any).update({
        risk_based_auth: securitySettings.loginProtection,
        updated_at: new Date().toISOString(),
      }).eq('id', user?.id);
      toast.success('Security settings saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveNotifications = async () => {
    try {
      await (supabase.from('users') as any).update({
        security_alerts: notificationSettings.emailAlerts,
        new_device_alerts: notificationSettings.pushNotif,
        updated_at: new Date().toISOString(),
      }).eq('id', user?.id);
      toast.success('Notification settings saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveAccess = async () => {
    try {
      await (supabase.from('users') as any).update({
        updated_at: new Date().toISOString(),
      }).eq('id', user?.id);
      toast.success('Access settings saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const categories = [
    { id: 'general', label: 'General Preferences', icon: Settings },
    { id: 'security', label: 'Security & Policies', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'access', label: 'Access Management', icon: Lock },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
    { id: 'admin', label: 'Admin Safeguards', icon: Command }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">Platform Settings</h1>
            <p className="text-gray-400">Configure global enterprise cybersecurity parameters</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeCategory === cat.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <cat.icon className="w-5 h-5" />
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {fetching ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <>
                      {activeCategory === 'general' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4">General Preferences</h3>
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <label className="text-sm font-semibold text-gray-300">Default Theme</label>
                              <select 
                                value={generalSettings.theme}
                                onChange={(e) => setGeneralSettings({...generalSettings, theme: e.target.value})}
                                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none"
                              >
                                <option value="dark">Secure Dark Mode</option>
                                <option value="light">System Light Mode</option>
                              </select>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <label className="text-sm font-semibold text-gray-300">Time Zone</label>
                              <select 
                                value={generalSettings.timezone}
                                onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none"
                              >
                                <option value="UTC-5 (EST)">UTC-5 (EST)</option>
                                <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
                                <option value="UTC+5:30 (IST)">UTC+5:30 (IST)</option>
                              </select>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={saveGeneral} className="bg-blue-600 hover:bg-blue-500">Save Settings</Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {activeCategory === 'security' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4">Security & Policies</h3>
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white">Proactive Login Threat Safeguards</h4>
                                <p className="text-xs text-gray-400 mt-1">Instantly trigger system quarantines when rapid suspicious login behaviors are verified.</p>
                              </div>
                              <div 
                                onClick={() => setSecuritySettings({...securitySettings, loginProtection: !securitySettings.loginProtection})}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${securitySettings.loginProtection ? 'bg-blue-600' : 'bg-white/10'}`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${securitySettings.loginProtection ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={saveSecurity} className="bg-blue-600 hover:bg-blue-500">Save Security Settings</Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {activeCategory === 'notifications' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4">Notifications</h3>
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white">Critical Threat Email Alerts</h4>
                                <p className="text-xs text-gray-400 mt-1">Instantly receive emails regarding system policy violations or failed authentication attempts.</p>
                              </div>
                              <div 
                                onClick={() => setNotificationSettings({...notificationSettings, emailAlerts: !notificationSettings.emailAlerts})}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notificationSettings.emailAlerts ? 'bg-blue-600' : 'bg-white/10'}`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationSettings.emailAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white">Push System notifications</h4>
                                <p className="text-xs text-gray-400 mt-1">Enable real-time push alerts within active administrative web browser sessions.</p>
                              </div>
                              <div 
                                onClick={() => setNotificationSettings({...notificationSettings, pushNotif: !notificationSettings.pushNotif})}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notificationSettings.pushNotif ? 'bg-blue-600' : 'bg-white/10'}`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationSettings.pushNotif ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={saveNotifications} className="bg-blue-600 hover:bg-blue-500">Save Notification Settings</Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {activeCategory === 'access' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4">Access Management</h3>
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white">Require Justification For Access</h4>
                                <p className="text-xs text-gray-400 mt-1">Enforce employees to provide brief justification writeups during resource access requests.</p>
                              </div>
                              <div 
                                onClick={() => setAccessSettings({...accessSettings, requireReason: !accessSettings.requireReason})}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${accessSettings.requireReason ? 'bg-blue-600' : 'bg-white/10'}`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${accessSettings.requireReason ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={saveAccess} className="bg-blue-600 hover:bg-blue-500">Save Access Settings</Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {activeCategory === 'billing' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4">Billing Settings</h3>
                          <BillingSection />
                        </Card>
                      )}

                      {activeCategory === 'admin' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold border-b border-white/10 pb-4">Admin Safeguards (Strict Mode)</h3>
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300">
                            <h4 className="font-semibold text-red-200">Sensitive System Configurations</h4>
                            <p className="text-xs mt-1 leading-relaxed">Modifying options below can trigger platform-wide audits or reset session hashes. Exercise extreme care.</p>
                          </div>
                        </Card>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
