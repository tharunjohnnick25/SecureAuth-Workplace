'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, CreditCard, Activity, Laptop, Eye, Check, AlertTriangle, ShieldCheck, Trash2, Camera, Loader2, FileText } from 'lucide-react';
import { BillingSection } from '@/components/settings/BillingSection';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useRealtimeData } from '@/hooks/useRealtimeData';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'subscription' | 'activity' | 'devices' | 'privacy'>('personal');
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [passwords, setPasswords] = useState({ newPass: '', confirm: '' });

  const { data: loginHistory } = useRealtimeData('login_logs', (q) =>
    q.select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(10)
  );

  const { data: dbDevices } = useRealtimeData('devices', (q) =>
    q.select('*').eq('user_id', user?.id)
  );

  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: 'SecureAuth Corp',
    employeeId: '',
    role: 'Employee'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setFetching(true);
    try {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        const savedAvatar = user?.id ? localStorage.getItem(`mock_avatar_${user.id}`) : null;
        setProfile({ avatar_url: savedAvatar || user?.avatar_url });
        setPersonalInfo({
          name: user?.full_name || 'User',
          email: user?.email || '',
          phone: '',
          company: 'SecureAuth Corp',
          employeeId: user?.employee_id || `EMP-${user?.id?.substring(0, 4)?.toUpperCase() || '0001'}`,
          role: user?.role || 'Employee'
        });
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (data) {
        const p = data as any;
        setProfile(p);
        setPersonalInfo({
          name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'User',
          email: p.email || user?.email || '',
          phone: p.phone || '',
          company: 'SecureAuth Corp',
          employeeId: p.employee_id || `EMP-${p.id?.substring(0, 4).toUpperCase()}`,
          role: p.role || 'Employee'
        });
      }
    } catch {} finally {
      setFetching(false);
    }
  };

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        toast.success('Profile updated successfully');
        return;
      }

      const { error } = await (supabase.from('users') as any)
        .update({
          full_name: personalInfo.name,
          phone: personalInfo.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          setProfile((prev: any) => ({ ...prev, avatar_url: result }));
          setUser({ ...user!, avatar_url: result });
          if (user?.id) localStorage.setItem(`mock_avatar_${user.id}`, result);
          toast.success('Profile image updated');
          setUploadingImage(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/profile.${fileExt}`;
      await supabase.storage.from('profile-images').upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(filePath);
      await (supabase.from('users') as any).update({ avatar_url: publicUrl }).eq('id', user?.id);
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setUser({ ...user!, avatar_url: publicUrl });
      toast.success('Profile image updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
      setUploadingImage(false);
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
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswords({ newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      await supabase.from('devices').delete().eq('id', deviceId);
      toast.success('Device removed');
    } catch {}
  };

  const menuItems = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'security', label: 'Security Settings', icon: Shield },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'activity', label: 'Activity Dashboard', icon: Activity },
    { id: 'devices', label: 'Connected Devices', icon: Laptop },
    { id: 'privacy', label: 'Privacy & Permissions', icon: Eye }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">User Profile</h1>
            <p className="text-gray-400">Manage your enterprise identity and account settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
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
                      {activeTab === 'personal' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10">
                          <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Personal Information</h3>
                          <form onSubmit={handleSavePersonalInfo} className="space-y-6">
                            <div className="flex items-center gap-6 mb-4">
                              <div className="relative group">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                                  {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-8 h-8 text-white" />
                                  )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold">{personalInfo.name}</h3>
                                <p className="text-sm text-gray-400">{personalInfo.role} • {personalInfo.employeeId}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="text-sm font-semibold text-gray-300 mb-2 block">Full Name</label>
                                <Input value={personalInfo.name} onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})} className="bg-black/50 border-white/10" />
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-300 mb-2 block">Email Address</label>
                                <Input value={personalInfo.email} disabled className="bg-black/50 border-white/10 text-gray-500" />
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-300 mb-2 block">Phone Number</label>
                                <Input value={personalInfo.phone} onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})} className="bg-black/50 border-white/10" />
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-300 mb-2 block">Employee ID</label>
                                <Input value={personalInfo.employeeId} disabled className="bg-black/50 border-white/10 text-gray-500" />
                              </div>
                            </div>
                            <div className="flex justify-end pt-4">
                              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 font-bold px-8">Save Info</Button>
                            </div>
                          </form>
                        </Card>
                      )}

                      {activeTab === 'security' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-8">
                          <div>
                            <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Security Settings</h3>
                            <div className="space-y-4 mb-8">
                              <h4 className="font-semibold text-gray-300">Change Password</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input type="password" placeholder="New Password" value={passwords.newPass}
                                  onChange={(e) => setPasswords({...passwords, newPass: e.target.value})} className="bg-black/50 border-white/10" />
                                <Input type="password" placeholder="Confirm Password" value={passwords.confirm}
                                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} className="bg-black/50 border-white/10" />
                              </div>
                              <Button onClick={updatePassword} className="bg-white/5 hover:bg-white/10 border border-white/10">Update Password</Button>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                              <div className="flex justify-between items-center mb-4">
                                <div>
                                  <h4 className="font-semibold text-gray-300">Multi-Factor Authentication (MFA)</h4>
                                  <p className="text-sm text-gray-400 mt-1">Add an extra layer of security.</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${profile?.is_mfa_enabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                  {profile?.is_mfa_enabled ? 'Active' : 'Not Set Up'}
                                </span>
                              </div>
                              <Button variant="outline" onClick={() => window.location.href = profile?.is_mfa_enabled ? '/mfa-settings' : '/mfa-setup'}
                                className={profile?.is_mfa_enabled ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10'}>
                                {profile?.is_mfa_enabled ? 'Manage MFA' : 'Enable MFA'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      {activeTab === 'activity' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10">
                          <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Login Activity</h3>
                          <div className="space-y-4">
                            {loginHistory && loginHistory.length > 0 ? loginHistory.slice(0, 10).map((log: any, i: number) => (
                              <div key={log.id || i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 items-start">
                                <div className={`p-2.5 rounded-lg ${log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {log.status === 'SUCCESS' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-white">
                                    {log.status === 'SUCCESS' ? 'Successful Login' : 'Failed Login Attempt'}
                                  </h4>
                                  <p className="text-sm text-gray-400 mt-1">
                                    {log.city || 'Unknown'}, {log.country || 'XX'} • {log.ip_address}
                                  </p>
                                  <span className="text-xs text-gray-500 mt-2 block">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )) : (
                              <div className="text-center py-10 text-gray-500">
                                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>No login activity recorded yet.</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {activeTab === 'devices' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10">
                          <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Connected Devices</h3>
                          <p className="text-sm text-gray-400 mb-6">Manage all authorized hardware endpoints connected to your account.</p>
                          <div className="divide-y divide-white/5">
                            {dbDevices && dbDevices.length > 0 ? dbDevices.map((device: any) => (
                              <div key={device.id} className="flex justify-between items-center py-4">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-white/5 rounded-xl text-blue-400">
                                    <Laptop className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-white">{device.device_name || device.browser || 'Unknown Device'}</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">{device.browser} • {device.os}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs ${device.is_trusted ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {device.is_trusted ? 'Trusted' : 'Unknown'}
                                  </span>
                                  <button onClick={() => removeDevice(device.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )) : (
                              <div className="text-center py-10 text-gray-500">
                                <Laptop className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>No devices registered yet.</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {activeTab === 'subscription' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10">
                          <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Subscription</h3>
                          <BillingSection />
                        </Card>
                      )}

                      {activeTab === 'privacy' && (
                        <Card className="p-6 md:p-8 bg-black/40 backdrop-blur-xl border-white/10 space-y-6">
                          <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Privacy & Permissions</h3>
                          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300">
                            <p className="text-sm">Your data is protected by enterprise-grade encryption and zero-trust security protocols.</p>
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
