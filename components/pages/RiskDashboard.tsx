'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Globe, 
  Smartphone, 
  Keyboard, 
  MapPin, 
  AlertTriangle,
  TrendingUp,
  Cpu,
  Fingerprint,
  Zap,
  Lock,
  Search,
  Eye,
  RefreshCw,
  Bell,
  History as HistoryIcon,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

// Standard threat taxonomy vectors
const defaultThreatRadar = [
  { subject: 'Brute Force', A: 0, fullMark: 100 },
  { subject: 'Impossible Travel', A: 0, fullMark: 100 },
  { subject: 'Credential Stuffing', A: 0, fullMark: 100 },
  { subject: 'Session Hijack', A: 0, fullMark: 100 },
  { subject: 'OS Mismatch', A: 0, fullMark: 100 },
  { subject: 'Behavior Drift', A: 0, fullMark: 100 },
];

const defaultDeviceDistribution = [
  { name: 'Trusted', value: 0, color: '#3b82f6' },
  { name: 'Untrusted', value: 0, color: '#f43f5e' },
  { name: 'Unknown', value: 0, color: '#a855f7' },
];

interface DashboardData {
  totalThreatsDetected: number;
  averageRiskScore: number;
  criticalAnomaliesCount: number;
  highRiskUsersCount: number;
  compromiseProbabilityAvg: number;
  threatTrends: Array<{ date: string; risk: number; threats: number }>;
  highRiskUsers: Array<{ id: string; email: string; score: number; level: string; factor: string }>;
  recentAnomalies: Array<{ id: string; type: string; severity: string; userEmail: string; time: string }>;
}

export function RiskDashboard({ hideLayout }: { hideLayout?: boolean }) {
    const { t } = useLanguage();
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/ai/dashboard');
      if (!res.ok) throw new Error('Failed to fetch AI metrics');
      const stats = await res.json();
      setData(stats);
    } catch (err: any) {
      toast.error(err.message || 'Error pulling security telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 8000); // Poll every 8s

    return () => clearInterval(interval);
  }, [isLive]);

  const stats = data || {
    totalThreatsDetected: 0,
    averageRiskScore: 0,
    criticalAnomaliesCount: 0,
    highRiskUsersCount: 0,
    compromiseProbabilityAvg: 0,
    threatTrends: [],
    highRiskUsers: [],
    recentAnomalies: []
  };

  const content = (
    <div className="w-full space-y-8">
      {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <ShieldAlert className="text-blue-400 w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">AI Risk Monitoring</h1>
              </div>
              <p className="text-gray-400">Deep neural behavioral analysis</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 glass-panel border-blue-500/20">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                  {isLive ? 'Live Surveillance' : 'Paused'}
                </span>
              </div>
              <button 
                onClick={() => {
                  setLoading(true);
                  fetchStats();
                }}
                className="w-10 h-10 glass-panel flex items-center justify-center hover:bg-white/5 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-400">Compiling machine learning insights...</p>
            </div>
          ) : (
            <>
              {/* Top Tier Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="glass-panel border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Zap className="text-blue-400 w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Healthy</span>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Avg system risk</p>
                      <h3 className="text-3xl font-bold text-white mt-1">
                        {stats.averageRiskScore}
                        <span className="text-sm font-medium text-gray-500">/100</span>
                      </h3>
                      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stats.averageRiskScore}%` }} 
                          className="h-full bg-blue-500"
                        ></motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="glass-panel border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Fingerprint className="text-purple-400 w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded">Stable</span>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Bayesian compromise probability</p>
                      <h3 className="text-3xl font-bold text-white mt-1">
                        {stats.compromiseProbabilityAvg}%
                      </h3>
                      <div className="mt-4 flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <div 
                            key={i} 
                            className={`h-1.5 flex-1 rounded-full ${
                              i < (stats.compromiseProbabilityAvg / 12) + 1 ? 'bg-purple-500' : 'bg-white/5'
                            }`}
                          ></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="glass-panel border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <AlertTriangle className="text-red-400 w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                          {stats.criticalAnomaliesCount} Critical</span>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Active threat anomalies</p>
                      <h3 className="text-3xl font-bold text-white mt-1">
                        {stats.totalThreatsDetected}
                      </h3>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-red-400" />
                        Surveillance led</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card className="glass-panel border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <ShieldCheck className="text-green-400 w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">Healthy</span>
                      </div>
                      <p className="text-sm text-gray-400 font-medium">High risk identities</p>
                      <h3 className="text-3xl font-bold text-white mt-1">
                        {stats.highRiskUsersCount}
                      </h3>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Adaptive step-up enabled</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Main Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Risk Distribution Heatmap Style */}
                <Card className="lg:col-span-2 glass-panel p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold">Authentication risks</h3>
                      <p className="text-sm text-gray-400">Correlated realtime risk signals</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-gray-400">Total anomalies</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-xs text-gray-400">Risk score</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.threatTrends}>
                        <defs>
                          <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="threats" stroke="#3b82f6" strokeWidth={3} fill="url(#colorSuccess)" />
                        <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fill="url(#colorRisk)" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Threat Radar */}
                <Card className="glass-panel p-6">
                  <h3 className="text-xl font-bold mb-2">Threat intelligence</h3>
                  <p className="text-sm text-gray-400 mb-8">Attack vector distribution</p>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={defaultThreatRadar}>
                        <PolarGrid stroke="#ffffff10" />
                        <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                        <PolarRadiusAxis stroke="#ffffff10" fontSize={8} />
                        <Radar
                          name="Threat Level"
                          dataKey="A"
                          stroke="#a855f7"
                          fill="#a855f7"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                     <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                       <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{'Top vector'}</div>
                       <div className="text-sm font-bold text-white mt-1">{'None'}</div>
                    </div>
                    <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                       <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{'Detection rate'}</div>
                       <div className="text-sm font-bold text-white mt-1">0%</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Lower Section: Biometrics & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Device Trust & Biometrics */}
                <div className="lg:col-span-1 space-y-6">
                   <Card className="glass-panel p-6">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-400" /> Device integrity</h4>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={defaultDeviceDistribution}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {defaultDeviceDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3 mt-4">
                        {defaultDeviceDistribution.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                               <span className="text-xs text-gray-400">{d.name}</span>
                             </div>
                             <span className="text-xs font-bold text-white">{d.value}%</span>
                          </div>
                        ))}
                      </div>
                   </Card>

                   <Card className="glass-panel p-6 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-4">
                        <Keyboard className="w-12 h-12 text-purple-500/10 group-hover:text-purple-500/20 transition-colors" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Typing biometrics</h4>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                           <Fingerprint className="text-purple-400 w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">0%</div>
                          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{'Confidence score'}</div>
                        </div>
                      </div>
                      <div className="flex gap-0.5 h-12 items-end">
                        {[0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((h, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: i * 0.05 }}
                            className="flex-1 bg-purple-500/40 rounded-t-sm"
                          ></motion.div>
                        ))}
                      </div>
                   </Card>
                </div>

                {/* Live Activity Feed */}
                <Card className="lg:col-span-3 glass-panel p-6 h-fit">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" /> Neural security stream</h3>
                     <div className="text-xs text-gray-500 font-mono">ENCRYPTED FEED V4.1120</div>
                  </div>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {stats.recentAnomalies.length > 0 ? (
                      stats.recentAnomalies.map((item, i) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${
                              item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'HIGH' ? 'text-yellow-400' : 'text-blue-400'
                            } group-hover:scale-110 transition-transform`}>
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-white">{item.type}</span>
                                 <span className="text-[10px] text-gray-500 font-mono">{item.userEmail}</span>
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                 <MapPin className="w-3 h-3" /> {'Security alert'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className={`text-sm font-bold ${
                               item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'HIGH' ? 'text-yellow-400' : 'text-green-400'
                             }`}>
                               {item.severity}
                             </div>
                             <div className="text-[10px] text-gray-500 font-mono mt-0.5">{item.time}</div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">No unresolved anomalies</p>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setIsLive(!isLive)}
                    className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-400 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                      {isLive ? (
                        <>
                          <HistoryIcon className="w-4 h-4" />
                          Historical archive</>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-blue-400" />
                          Resume live surveillance</>
                      )}
                  </button>
                </Card>
              </div>
            </>
          )}
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          {content}
        </main>
      </div>
    </div>
  );
}
