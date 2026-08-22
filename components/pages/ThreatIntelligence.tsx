'use client';

import React, { useState, useMemo } from 'react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Globe, 
  Target, 
  AlertTriangle, 
  Zap, 
  Skull, 
  Radar, 
  Crosshair, 
  Shield, 
  Lock,
  Search,
  MapPin,
  Clock,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { useLanguage } from "@/context/LanguageContext";

const attackData = [
  { time: '00:00', bruteForce: 0, stuffing: 0, vpn: 0 },
  { time: '04:00', bruteForce: 0, stuffing: 0, vpn: 0 },
  { time: '08:00', bruteForce: 0, stuffing: 0, vpn: 0 },
  { time: '12:00', bruteForce: 0, stuffing: 0, vpn: 0 },
  { time: '16:00', bruteForce: 0, stuffing: 0, vpn: 0 },
  { time: '20:00', bruteForce: 0, stuffing: 0, vpn: 0 },
  { time: '23:59', bruteForce: 0, stuffing: 0, vpn: 0 },
];

const vectorDistribution = [
  { name: 'Brute Force', value: 0, color: '#ef4444' },
  { name: 'Credential Stuffing', value: 0, color: '#f59e0b' },
  { name: 'VPN/Proxy', value: 0, color: '#3b82f6' },
  { name: 'Impossible Travel', value: 0, color: '#8a2be2' },
];


export function ThreatIntelligence() {
    const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const { data: dbThreats } = useRealtimeData('threat_logs');

  const threats = useMemo(() => {
    let sourceThreats: any[] = [];
    if (dbThreats && dbThreats.length > 0) {
      sourceThreats = dbThreats.map((t: any) => ({
        type: t.type,
        user: 'unknown',
        risk: t.severity,
        origin: t.source_ip || 'Unknown',
        time: 'Just now'
      }));
    }
    
    return sourceThreats.filter((t: any) => 
      t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.origin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dbThreats, searchTerm]);

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
                  <Target className="text-red-400 w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{'Threat intellige'}</h1>
              </div>
              <p className="text-gray-400">{'Realtimeglobala'}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                 <span className="text-xs font-bold text-red-400 uppercase tracking-widest">{'Global threat lev'}</span>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Attacks Blocked', value: '0', icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Active Threats', value: dbThreats?.length?.toString() || '0', icon: Skull, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Avg Risk Score', value: '0%', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { label: 'VPN Logins', value: '0', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ].map((stat, i) => (
              <Card key={i} className="glass-panel p-6">
                <div className="flex justify-between items-start mb-4">
                   <div className={`p-2 ${stat.bg} rounded-lg`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                   </div>
                   <TrendingUp className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{stat.label}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Live Attack Visualization */}
            <Card className="lg:col-span-2 glass-panel p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8">
                  <Radar className="w-32 h-32 text-red-500/5 animate-spin-slow" />
               </div>
               
               <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-xl font-bold">{'Attack propagati'}</h3>
                    <p className="text-sm text-gray-400 font-medium">{'Realtimecorrela'}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold text-gray-400 uppercase">{t('24hHistory_1303')}</div>
                  </div>
               </div>

               <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attackData}>
                      <defs>
                        <linearGradient id="colorBrute" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="bruteForce" stroke="#ef4444" strokeWidth={3} fill="url(#colorBrute)" />
                      <Area type="monotone" dataKey="stuffing" stroke="#f59e0b" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>

               <div className="mt-8 flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-400">{'Brute force'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-yellow-500 border-dashed"></div>
                    <span className="text-xs text-gray-400">{'Credential stuff'}</span>
                  </div>
               </div>
            </Card>

            {/* AI Threat Predictions */}
            <Card className="glass-panel p-8 flex flex-col">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Cpu className="text-purple-400 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{'Aiforecasting'}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{'Predictive defen'}</p>
                  </div>
               </div>

               <div className="space-y-6 flex-1">
                  <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl relative overflow-hidden group">
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-purple-300">{'Botnet activity s'}</span>
                        <span className="text-[10px] font-black text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded uppercase">{t('84PROB_1309')}</span>
                     </div>
                     <p className="text-xs text-gray-400 leading-relaxed">
                        {t('Predicted15incr_1310')}</p>
                      <motion.div 
                        animate={{ x: ['-100%', '100%'] }} 
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                      />
                  </div>

                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-blue-300">{'Pattern recognit'}</span>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase">{'Low risk'}</span>
                     </div>
                     <p className="text-xs text-gray-400 leading-relaxed">
                        {'Currentsessione'}</p>
                  </div>
               </div>

               <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-all">
                  {'Generate full thr'}</button>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Security Incident Logs */}
            <Card className="lg:col-span-3 glass-panel p-8">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <Activity className="w-5 h-5 text-red-400" /> {'Security inciden'}</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Filter incidents..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs outline-none focus:border-red-500/30 w-48" 
                    />
                  </div>
               </div>

                <div className="space-y-3">
                  {threats.map((incident, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                          incident.risk === 'CRITICAL' ? 'bg-red-500/20 border-red-500/20 text-red-400' : 
                          incident.risk === 'HIGH' ? 'bg-orange-500/20 border-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 border-blue-500/20 text-blue-400'
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-white">{incident.type}</span>
                             <span className="text-[10px] text-gray-500 font-mono">{incident.user}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1">
                             <MapPin className="w-3 h-3" /> {incident.origin} • <Clock className="w-3 h-3" /> {incident.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                           incident.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 
                           incident.risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                           'bg-blue-500/20 text-blue-400'
                         }`}>
                           {incident.risk}
                         </div>
                         <ChevronRight className="w-4 h-4 text-gray-700 mt-2 ml-auto group-hover:text-white transition-colors" />
                      </div>
                    </motion.div>
                  ))}
               </div>
            </Card>

            {/* Vector Distribution */}
            <Card className="glass-panel p-8">
               <h3 className="text-lg font-bold mb-8">{'Attack vectors'}</h3>
               <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vectorDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {vectorDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="space-y-4 mt-8">
                  {vectorDistribution.map((v) => (
                    <div key={v.name} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }}></div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{v.name}</span>
                       </div>
                       <span className="text-xs font-bold text-white">{v.value}%</span>
                    </div>
                  ))}
               </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
