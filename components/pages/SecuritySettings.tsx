'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  Shield, 
  Smartphone, 
  Globe, 
  Bell, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  Smartphone as DeviceIcon,
  Monitor,
  Tablet,
  ChevronRight,
  ShieldCheck,
  Key
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useLanguage } from "@/context/LanguageContext";

type SettingsTab = 'security' | 'devices' | 'sessions' | 'privacy';

export function SecuritySettings() {
    const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  const [mfaEnabled, setMfaEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">{'Security profile'}</h1>
            <p className="text-gray-400">{'Manageyourident'}</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-2xl w-fit">
             {[
               { id: 'security', label: 'Security', icon: Shield },
               { id: 'devices', label: 'Trusted Devices', icon: Smartphone },
               { id: 'sessions', label: 'Active Sessions', icon: Globe },
               { id: 'privacy', label: 'Privacy', icon: Eye },
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as SettingsTab)}
                 className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                   activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-gray-500 hover:text-gray-300'
                 }`}
               >
                 <tab.icon className="w-4 h-4" /> {tab.label}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
               <AnimatePresence mode="wait">
                  {activeTab === 'security' && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                       {/* MFA Section */}
                       <Card className="glass-panel p-8">
                          <div className="flex items-center justify-between mb-8">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                   <Key className="text-blue-400 w-6 h-6" />
                                </div>
                                <div>
                                   <h3 className="text-lg font-bold">{'Multi factor auth'}</h3>
                                   <p className="text-xs text-gray-500">{'Addanextralayer'}</p>
                                </div>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${mfaEnabled ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'}`}>
                                {mfaEnabled ? 'Enabled' : 'Disabled'}
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                                <div className="flex items-center gap-4">
                                   <Smartphone className="w-5 h-5 text-gray-400" />
                                   <div>
                                      <div className="text-sm font-bold">{'Authenticator ap'}</div>
                                      <div className="text-xs text-gray-500">{'Google authentic'}</div>
                                   </div>
                                </div>
                                <button className="text-xs font-bold text-blue-400 hover:text-blue-300">{'Configure'}</button>
                             </div>
                             <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                                <div className="flex items-center gap-4">
                                   <ShieldCheck className="w-5 h-5 text-gray-400" />
                                   <div>
                                      <div className="text-sm font-bold">{'Hardware securit'}</div>
                                      <div className="text-xs text-gray-500">{'Yubi keyorother f'}</div>
                                   </div>
                                </div>
                                <button className="text-xs font-bold text-blue-400 hover:text-blue-300">{'Register'}</button>
                             </div>
                          </div>
                       </Card>

                       {/* Password Section */}
                       <Card className="glass-panel p-8">
                          <h3 className="text-lg font-bold mb-6">{'Password managem'}</h3>
                          <form className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input type="password" placeholder="Current Password" icon={<Lock className="w-4 h-4" />} className="bg-black/20" />
                                <Input type="password" placeholder="New Password" icon={<Lock className="w-4 h-4" />} className="bg-black/20" />
                             </div>
                             <Button className="w-full md:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10">
                                {'Update password'}</Button>
                          </form>
                       </Card>
                    </motion.div>
                  )}

                  {activeTab === 'devices' && (
                    <motion.div
                      key="devices"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                       {[
                         { name: 'MacBook Pro 16"', type: 'desktop', last: 'Active Now', trusted: true },
                         { name: 'iPhone 15 Pro', type: 'mobile', last: '2h ago', trusted: true },
                         { name: 'iPad Air', type: 'tablet', last: '1d ago', trusted: false },
                       ].map((device, i) => (
                         <div key={i} className="glass-panel p-6 flex items-center justify-between group">
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/20 transition-all">
                                  {device.type === 'desktop' ? <Monitor className="w-6 h-6 text-blue-400" /> : 
                                   device.type === 'mobile' ? <DeviceIcon className="w-6 h-6 text-purple-400" /> :
                                   <Tablet className="w-6 h-6 text-green-400" />}
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <h4 className="font-bold text-white">{device.name}</h4>
                                     {device.trusted && <ShieldCheck className="w-3 h-3 text-green-400" />}
                                  </div>
                                  <div className="text-xs text-gray-500">{device.last} • {device.trusted ? 'Trusted Device' : 'Verification Required'}</div>
                               </div>
                            </div>
                            <button className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all">
                               <LogOut className="w-5 h-5" />
                            </button>
                         </div>
                       ))}
                       <button className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-xs font-bold text-gray-500 hover:border-blue-500/20 hover:text-blue-400 transition-all">
                          {'Register new trus'}</button>
                    </motion.div>
                  )}

                  {activeTab === 'sessions' && (
                    <motion.div
                      key="sessions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                       <Card className="glass-panel p-8">
                          <h3 className="text-lg font-bold mb-6">{'Current active se'}</h3>
                          <div className="space-y-4">
                             {[
                               { ip: '192.168.1.1', location: 'New York, US', browser: 'Chrome 122', current: true },
                               { ip: '45.12.33.10', location: 'London, UK', browser: 'Safari Mobile', current: false },
                             ].map((session, i) => (
                               <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                     <Globe className={`w-5 h-5 ${session.current ? 'text-green-400' : 'text-gray-500'}`} />
                                     <div>
                                        <div className="text-sm font-bold flex items-center gap-2">
                                           {session.ip} {session.current && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">{'Current'}</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">{session.browser} • {session.location}</div>
                                     </div>
                                  </div>
                                  {!session.current && <button className="text-xs font-bold text-red-400 hover:text-red-300">{'Revoke'}</button>}
                               </div>
                             ))}
                          </div>
                          <button className="mt-8 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-2">
                             <LogOut className="w-4 h-4" /> {'Terminate all oth'}</button>
                       </Card>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>

            {/* Sidebar Stats Area */}
            <div className="space-y-6">
               <Card className="glass-panel p-6 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Shield className="text-blue-400 w-5 h-5" />
                     </div>
                     <h3 className="font-bold">{'Security score'}</h3>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                     <span className="text-4xl font-black">94</span>
                     <span className="text-gray-500 font-bold mb-1">/100</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-6">
                     <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  </div>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{'Mfastatus'}</span>
                        <span className="text-green-400 font-bold">{'Enabled'}</span>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{'Password age'}</span>
                        <span className="text-yellow-400 font-bold">{t('42Days_1201')}</span>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{'Trusted devices'}</span>
                        <span className="text-white font-bold">{t('34Active_1203')}</span>
                     </div>
                  </div>
               </Card>

               <Card className="glass-panel p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                     <Bell className="w-4 h-4 text-purple-400" /> {'Notifications'}</h3>
                  <div className="space-y-4">
                     {[
                       { label: 'Security Alerts', desc: 'Critical account warnings', enabled: true },
                       { label: 'Login Notifications', desc: 'Alert on new device entry', enabled: true },
                       { label: 'System Updates', desc: 'Product feature announcements', enabled: false },
                     ].map((pref, i) => (
                       <div key={i} className="flex items-center justify-between">
                          <div>
                             <div className="text-sm font-bold text-gray-300">{pref.label}</div>
                             <div className="text-[10px] text-gray-500 uppercase tracking-tighter">{pref.desc}</div>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${pref.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                             <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${pref.enabled ? 'right-1' : 'left-1'}`} />
                          </div>
                       </div>
                     ))}
                  </div>
               </Card>

               <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
                  <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2 text-sm">
                     <AlertTriangle className="w-4 h-4" /> {'Danger zone'}</h3>
                  <p className="text-[10px] text-gray-500 mb-4 uppercase tracking-tighter">
                     {'Irreversibleact'}</p>
                  <button className="text-xs font-bold text-red-500 hover:text-red-400 underline transition-colors">
                     {'Delete account pe'}</button>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
