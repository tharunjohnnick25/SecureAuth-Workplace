'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Tablet,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Clock,
  MapPin,
  Globe,
  MoreVertical,
  Fingerprint,
  Info,
  ChevronRight,
  Shield,
  Search,
  Settings,
  Lock,
  Activity,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { PageHeader } from '@/components/PageHeader';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

const initialDevices = [
  {
    id: '1',
    deviceName: 'MacBook Pro 16"',
    deviceType: 'desktop',
    browser: 'Chrome 122.0.0',
    os: 'macOS 14.3.1',
    isTrusted: true,
    lastUsed: '2024-05-12T10:30:00Z',
    ipAddress: '192.168.1.15',
    location: { city: 'New York', country: 'US' },
    trustScore: 98,
    riskLevel: 'low',
  },
];

export function DeviceManagement() {
    const { t } = useLanguage();
  const { data: dbDevices } = useRealtimeData('devices');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOs, setFilterOs] = useState('all');

  const devices = useMemo(() => {
    if (!dbDevices || dbDevices.length === 0) return initialDevices;

    return dbDevices.map((d: any) => ({
      id: d.id,
      deviceName: d.device_name ?? d.deviceName,
      deviceType: d.device_type ?? d.deviceType ?? 'desktop',
      browser: d.browser ?? 'Unknown browser',
      os: d.os ?? 'Unknown OS',
      isTrusted: d.is_trusted ?? d.isTrusted,
      lastUsed: d.last_active || d.last_used || new Date().toISOString(),
      ipAddress: d.ip_address || d.ipAddress || 'Unknown IP',
      location: d.location || { city: 'Unknown', country: 'XX' },
      trustScore: typeof d.trust_score === 'number' ? d.trust_score : d.is_trusted ? 98 : 45,
      riskLevel: d.risk_level || (d.is_trusted ? 'low' : 'high'),
    }));
  }, [dbDevices]);

  const filteredDevices = useMemo(() => {
    return devices.filter(
      (d) => {
        const matchesSearch = d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) || d.os.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'trusted' ? d.isTrusted : !d.isTrusted);
        const matchesOs = filterOs === 'all' || d.os.toLowerCase().includes(filterOs.toLowerCase());
        return matchesSearch && matchesStatus && matchesOs;
      }
    );
  }, [devices, searchQuery, filterStatus, filterOs]);

  const toggleTrust = async (id: string) => {
    const device = devices.find((item) => item.id === id);
    if (!device) return;

    const supabase = createClient();
    const updated = !device.isTrusted;

    const { error } = await (supabase.from('devices') as any)
      .update({ is_trusted: updated, last_active: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Unable to update device trust status');
      console.error(error);
    } else {
      toast.success(`Device trust status updated`);
    }
  };

  const removeDevice = async (id: string) => {
    const supabase = createClient();

    const { error } = await supabase.from('devices').delete().eq('id', id);

    if (error) {
      toast.error('Unable to remove device');
      console.error(error);
    } else {
      toast.success('Device removed successfully');
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-6 h-6" />;
      case 'tablet': return <Tablet className="w-6 h-6" />;
      default: return <Monitor className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <PageHeader 
            title="Device Management" 
            description="Manage trusted hardware and monitor device-based access"
          >
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2">
              {'Add trusted devic'}</button>
          </PageHeader>

          {/* Device Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
             <Card className="glass-panel p-6 bg-gradient-to-br from-blue-500/5 to-transparent">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <ShieldCheck className="text-blue-400 w-6 h-6" />
                   </div>
                   <div>
                      <div className="text-3xl font-bold">{devices.filter(d => d.isTrusted).length}</div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{'Trusted devices'}</div>
                   </div>
                </div>
             </Card>
             <Card className="glass-panel p-6 bg-gradient-to-br from-red-500/5 to-transparent">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                      <ShieldAlert className="text-red-400 w-6 h-6" />
                   </div>
                   <div>
                      <div className="text-3xl font-bold">{devices.filter(d => !d.isTrusted).length}</div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{'Unknown risky'}</div>
                   </div>
                </div>
             </Card>
             <Card className="glass-panel p-6 bg-gradient-to-br from-purple-500/5 to-transparent">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                      <Fingerprint className="text-purple-400 w-6 h-6" />
                   </div>
                   <div>
                      <div className="text-3xl font-bold">96%</div>
                      <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{'Avg fleet trust'}</div>
                   </div>
                </div>
             </Card>
          </div>

          {/* Device Fleet List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" /> {'Device fleet'}
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search devices..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-blue-500/50 w-64"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500/50"
                >
                  <option className="bg-[#0f172a]" value="all">All Statuses</option>
                  <option className="bg-[#0f172a]" value="trusted">Trusted</option>
                  <option className="bg-[#0f172a]" value="unverified">Unverified</option>
                </select>
                <select
                  value={filterOs}
                  onChange={(e) => setFilterOs(e.target.value)}
                  className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500/50"
                >
                  <option className="bg-[#0f172a]" value="all">All OS</option>
                  <option className="bg-[#0f172a]" value="macos">macOS</option>
                  <option className="bg-[#0f172a]" value="windows">Windows</option>
                  <option className="bg-[#0f172a]" value="linux">Linux</option>
                  <option className="bg-[#0f172a]" value="ios">iOS</option>
                  <option className="bg-[#0f172a]" value="android">Android</option>
                </select>
              </div>
            </div>
            
            <AnimatePresence>
              {filteredDevices.map((device, i) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-panel p-6 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6 flex-1">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                        device.isTrusted ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">{device.deviceName}</h3>
                          {device.isTrusted ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                              <ShieldCheck className="w-3 h-3" /> {'Trusted'}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                              <ShieldAlert className="w-3 h-3" /> {'Unverified'}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {device.browser} {'On'}{device.os}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {device.location.city}, {device.location.country}</span>
                          <span className="flex items-center gap-1.5 font-mono">{device.ipAddress}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-10">
                      {/* AI Trust Score Meter */}
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{'Aitrust score'}</div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${device.trustScore}%` }} 
                              className={`h-full rounded-full ${
                                device.trustScore > 80 ? 'bg-blue-500' : device.trustScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            ></motion.div>
                          </div>
                          <span className="text-sm font-bold text-white">{device.trustScore}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <button 
                           onClick={() => toggleTrust(device.id)}
                           className={`p-2 rounded-lg border transition-all ${
                             device.isTrusted 
                               ? 'border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-gray-400 hover:text-red-400' 
                               : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                           }`}
                           title={device.isTrusted ? 'Untrust Device' : 'Trust Device'}
                         >
                           {device.isTrusted ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                         </button>
                         <button 
                           onClick={() => removeDevice(device.id)}
                           className="p-2 rounded-lg border border-white/10 text-gray-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
                           title="Remove Device"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                         <button className="p-2 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition-all">
                           <MoreVertical className="w-5 h-5" />
                         </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline / Metadata Sub-info */}
                  <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-6">
                       <span className="flex items-center gap-2 text-gray-500">
                         <Clock className="w-3.5 h-3.5" /> {t('Firstseen202401_824')}</span>
                       <span className="flex items-center gap-2 text-blue-400">
                         <Activity className="w-3.5 h-3.5" /> {'Lastactive'}{new Date(device.lastUsed).toLocaleDateString()}
                       </span>
                    </div>
                    <button className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
                      {'View full history'}<ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredDevices.length === 0 && (
               <div className="py-20 text-center glass-panel">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{'Nodevicesfound'}</h3>
                  <p className="text-gray-500">{'Tryadjustingyou'}</p>
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

