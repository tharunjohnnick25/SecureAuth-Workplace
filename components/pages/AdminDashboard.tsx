'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Download, 
  Smartphone,
  Globe,
  Cpu,
  Lock,
  ArrowUpRight,
  Eye,
  FileText
} from 'lucide-react';
import { 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line,
  PieChart, Pie, Cell 
} from 'recharts';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeData } from '@/hooks/useRealtimeData';

const threatTrend = [
  { day: 'Mon', threats: 0, blocked: 0 },
  { day: 'Tue', threats: 0, blocked: 0 },
  { day: 'Wed', threats: 0, blocked: 0 },
  { day: 'Thu', threats: 0, blocked: 0 },
  { day: 'Fri', threats: 0, blocked: 0 },
  { day: 'Sat', threats: 0, blocked: 0 },
  { day: 'Sun', threats: 0, blocked: 0 },
];

export function AdminDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const { data: realUsers } = useRealtimeData('users');

  const identities = useMemo(() => {
    if (!realUsers || realUsers.length === 0) return [];
    return realUsers.map((u: any, i: number) => ({
      name: u.full_name || 'Unknown User',
      email: u.email || '',
      role: u.role || 'Guest',
      status: u.status || 'Active',
      risk: (u.id.length * 7) % 100,
      last: i === 0 ? 'Just now' : `${i * 15}m ago`
    }));
  }, [realUsers]);
  
  const filteredIdentities = identities.filter((i: any) => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredIdentities.length / itemsPerPage) || 1;
  const paginatedIdentities = filteredIdentities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
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
                <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center border border-blue-600/20">
                  <Lock className="text-blue-400 w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{'Admin security hu'}</h1>
              </div>
              <p className="text-gray-400">{'Enterprisegover'}</p>
            </div>

            <div className="flex items-center gap-4">
               <button onClick={() => router.push('/reports-dashboard')} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-gray-300 hover:bg-white/10 transition-all">
                 <Download className="w-4 h-4" /> {'Export report'}</button>
               <button onClick={() => router.push('/security-policy')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                 {'New security poli'}</button>
            </div>
          </div>

          {/* High Level Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             {[
               { label: 'Total Identities', value: realUsers?.length || 0, icon: Users, color: 'text-blue-400', sub: 'Currently tracking' },
               { label: 'Threats Mitigated', value: 0, icon: ShieldCheck, color: 'text-green-400', sub: 'Zero threats detected' },
               { label: 'Avg Risk Score', value: 0, icon: AlertTriangle, color: 'text-yellow-400', sub: 'Low risk environment' },
               { label: 'Fleet Devices', value: 0, icon: Smartphone, color: 'text-purple-400', sub: 'Across 0 regions' },
             ].map((stat, i) => (
               <Card key={i} className="glass-panel p-6">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                       <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-600" />
                 </div>
                 <div className="text-2xl font-bold text-white">{stat.value}</div>
                 <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{stat.label}</div>
                 <div className="mt-4 text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{stat.sub}</div>
               </Card>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Threat Analytics Chart */}
            <Card className="lg:col-span-2 glass-panel p-8">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold">{'Threat mitigatio'}</h3>
                    <p className="text-sm text-gray-400 font-medium">{'Weeklyblockedvs'}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                       <span className="text-xs text-gray-400">{'Blocked'}</span>
                    </div>
                  </div>
               </div>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={threatTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="day" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="threats" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </Card>

            {/* AI Insights Card */}
            <Card className="glass-panel p-8 relative overflow-hidden flex flex-col">
               <div className="absolute top-0 right-0 p-8">
                  <Cpu className="w-32 h-32 text-blue-500/5 animate-pulse" />
               </div>
               
               <div className="flex items-center gap-3 mb-8 relative z-10">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-blue-400 w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">{'Aigovernance ins'}</h3>
               </div>

               <div className="space-y-6 flex-1 relative z-10">
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                     <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> {'Anomaly detectio'}</div>
                     <p className="text-xs text-gray-400 leading-relaxed">
                        {'Identitybehavio'}</p>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                     <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> {'Policy optimizat'}</div>
                     <p className="text-xs text-gray-400 leading-relaxed">
                        {'Recommended enfo'}</p>
                  </div>
               </div>

               <button onClick={() => router.push('/reports-dashboard')} className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20">
                  {'Generate governa'}</button>
            </Card>
          </div>

          {/* User Management Table */}
          <Card className="glass-panel p-8">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" /> {'Identity fleet ma'}</h3>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Search identities..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-blue-500/50 transition-all w-full md:w-64"
                      />
                   </div>
                   <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                     <Filter className="w-5 h-5" />
                   </button>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                      <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                         <th className="px-6 py-4">{'Identity'}</th>
                         <th className="px-6 py-4">{'Role'}</th>
                         <th className="px-6 py-4">{'Status'}</th>
                         <th className="px-6 py-4">{'Risk score'}</th>
                         <th className="px-6 py-4">{'Last activity'}</th>
                         <th className="px-6 py-4 text-right">{'Actions'}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {paginatedIdentities.map((user, i) => (
                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                                    {user.name.charAt(0)}
                                 </div>
                                 <div>
                                    <div className="text-sm font-bold text-white">{user.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{user.email}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-medium text-gray-400">{user.role}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                user.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                 {user.status}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${
                                      user.risk >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`} style={{ width: `${user.risk}%` }} />
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="text-xs font-bold text-white">{user.risk} <span className="text-gray-500 font-normal">/ 100</span></span>
                                   <span className={`text-[9px] uppercase font-bold ${user.risk >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                     {user.risk >= 80 ? 'Secure' : 'At Risk'}
                                   </span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{user.last}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="p-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all" title="View Profile">
                                    <Eye className="w-4 h-4" />
                                 </button>
                                 <button className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all" title={user.status === 'Active' ? 'Block Identity' : 'Unblock'}>
                                    <Ban className="w-4 h-4" />
                                 </button>
                                 <button className="p-2 hover:bg-white/5 rounded-lg transition-all">
                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
             
             <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
                <div>Showing {paginatedIdentities.length} of {filteredIdentities.length} identities</div>
                <div className="flex items-center gap-4">
                   <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="hover:text-white transition-colors disabled:opacity-50">{'Previous'}</button>
                   <div className="flex gap-2">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentPage(idx + 1)} className={`w-8 h-8 rounded transition-colors ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}>
                          {idx + 1}
                        </button>
                      ))}
                   </div>
                   <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="hover:text-white transition-colors disabled:opacity-50">{'Next'}</button>
                </div>
             </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
