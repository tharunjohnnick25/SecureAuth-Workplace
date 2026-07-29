'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Keyboard, 
  Fingerprint, 
  Activity, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Cpu, 
  TrendingUp,
  BrainCircuit,
  Lock,
  Unlock,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';

// Mock live data generator
const generateLiveStream = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    val: 40 + Math.random() * 40
  }));
};

export function TypingAnalytics() {
  const [typingText, setTypingText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [metrics, setMetrics] = useState(generateLiveStream());
  const [status, setStatus] = useState<'learning' | 'verifying' | 'matched' | 'anomaly'>('learning');
  
  // Stats
  const dwellTime = 84;
  const flightTime = 122;
  const jitter = 14;

  useEffect(() => {
    if (typingText.length > 0) {
      setIsAnalyzing(true);
      // Simulate real-time updates
      const interval = setInterval(() => {
        setMetrics(prev => [...prev.slice(1), { time: Date.now(), val: 30 + Math.random() * 60 }]);
        setWpm(Math.floor(60 + Math.random() * 20));
        setConfidence(prev => Math.min(98, prev + 2));
        if (confidence > 80) setStatus('matched');
        else if (confidence > 30) setStatus('verifying');
      }, 500);
      return () => clearInterval(interval);
    } else {
      setIsAnalyzing(false);
      setConfidence(0);
      setWpm(0);
      setStatus('learning');
    }
  }, [typingText]);

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Fingerprint className="text-purple-400 w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Typing Biometrics Analysis</h1>
              </div>
              <p className="text-gray-400">Behavioral neural profiling and real-time keystroke dynamics</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 glass-panel border-purple-500/20">
                 <Cpu className={`w-4 h-4 text-purple-400 ${isAnalyzing ? 'animate-spin-slow' : ''}`} />
                 <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    Neural Engine: {isAnalyzing ? 'Active' : 'Idle'}
                 </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Typing Capture Area */}
            <Card className="lg:col-span-2 glass-panel p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8">
                  <BrainCircuit className={`w-24 h-24 text-purple-500/5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
               </div>
               
               <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <Keyboard className="w-5 h-5 text-purple-400" /> Biometric Capture Node
               </h3>
               
               <div className="space-y-6">
                 <div className="relative">
                    <textarea 
                      value={typingText}
                      onChange={(e) => setTypingText(e.target.value)}
                      placeholder="Start typing to begin neural biometric analysis..."
                      className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-xl text-white outline-none focus:border-purple-500/50 transition-all resize-none placeholder:text-gray-700 font-mono"
                    />
                    {isAnalyzing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute bottom-6 right-6 flex items-center gap-2"
                      >
                         <div className="flex gap-1 items-end h-6">
                            {[1, 2, 3, 4, 5].map(i => (
                              <motion.div 
                                key={i}
                                animate={{ height: [10, 24, 10] }}
                                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                className="w-1 bg-purple-500/50 rounded-full"
                              />
                            ))}
                         </div>
                         <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Profiling...</span>
                      </motion.div>
                    )}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Words Per Min', value: wpm, icon: TrendingUp, color: 'text-blue-400' },
                      { label: 'Dwell Time', value: `${dwellTime}ms`, icon: Activity, color: 'text-purple-400' },
                      { label: 'Flight Time', value: `${flightTime}ms`, icon: Zap, color: 'text-yellow-400' },
                      { label: 'Rhythm Jitter', value: `${jitter}ms`, icon: RefreshCw, color: 'text-red-400' },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                          <stat.icon className={`w-3 h-3 ${stat.color}`} /> {stat.label}
                        </div>
                        <div className="text-xl font-bold">{stat.value}</div>
                      </div>
                    ))}
                 </div>
               </div>
            </Card>

            {/* AI Confidence Meter */}
            <Card className="glass-panel p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className={`absolute inset-0 bg-gradient-to-b ${
                 status === 'matched' ? 'from-green-500/5' : status === 'anomaly' ? 'from-red-500/5' : 'from-purple-500/5'
               } to-transparent`}></div>
               
               <h3 className="text-xl font-bold mb-10 relative">Neural Identity Verification</h3>
               
               <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                  {/* Outer Rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/5 animate-spin-slow"></div>
                  <div className="absolute inset-4 rounded-full border border-purple-500/10 border-dashed animate-spin-slow-reverse"></div>
                  
                  {/* Progress SVG */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96" cy="96" r="88"
                      stroke="currentColor" strokeWidth="8" fill="transparent"
                      className="text-white/5"
                    />
                    <motion.circle
                      cx="96" cy="96" r="88"
                      stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={553}
                      animate={{ strokeDashoffset: 553 - (553 * confidence) / 100 }}
                      className={status === 'matched' ? 'text-green-500' : 'text-purple-500'}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatePresence mode='wait'>
                      {status === 'matched' ? (
                        <motion.div key="matched" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                           <Unlock className="w-10 h-10 text-green-500 mb-1" />
                        </motion.div>
                      ) : (
                        <motion.div key="locked" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                           <Lock className="w-10 h-10 text-purple-400 mb-1" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="text-3xl font-black text-white">{confidence}%</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Confidence</div>
                  </div>
               </div>

               <div className="relative w-full space-y-4">
                  <div className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                    status === 'matched' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                    status === 'verifying' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    'bg-white/5 border-white/10 text-gray-500'
                  }`}>
                    {status === 'learning' && 'AWAITING INPUT...'}
                    {status === 'verifying' && 'ANALYZING PATTERNS...'}
                    {status === 'matched' && 'IDENTITY CONFIRMED'}
                    {status === 'anomaly' && 'ANOMALY DETECTED'}
                  </div>
                  
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Identity verified against historical baseline via 12-factor neural analysis.
                  </p>
               </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Rhythm Graph */}
            <Card className="lg:col-span-2 glass-panel p-6">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" /> Real-time Rhythm Stream
                  </h3>
                  <div className="text-xs text-gray-500 font-mono">FREQ_V2_ENCODED</div>
               </div>
               
               <div className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={metrics}>
                     <defs>
                       <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#8a2be2" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ display: 'none' }}
                     />
                     <Area 
                       type="monotone" 
                       dataKey="val" 
                       stroke="#8a2be2" 
                       strokeWidth={2}
                       fillOpacity={1} 
                       fill="url(#colorVal)" 
                       isAnimationActive={false}
                     />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </Card>

            {/* Neural Insights */}
            <Card className="glass-panel p-6">
               <h3 className="text-lg font-bold mb-6">Neural Insights</h3>
               <div className="space-y-4">
                  {[
                    { label: 'Baseline Stability', val: 'High', color: 'text-green-400' },
                    { label: 'Key Velocity', val: 'Consistent', color: 'text-blue-400' },
                    { label: 'Error Distribution', val: 'Normal', color: 'text-green-400' },
                    { label: 'Shift Usage', val: 'Profile Match', color: 'text-purple-400' },
                  ].map((insight, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                       <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{insight.label}</span>
                       <span className={`text-xs font-bold ${insight.color}`}>{insight.val}</span>
                    </div>
                  ))}
               </div>
               
               <div className="mt-6 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-tighter">
                    AI learning active. System is currently mapping secondary keystroke 
                    intervals to further strengthen the identity profile.
                  </p>
               </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
