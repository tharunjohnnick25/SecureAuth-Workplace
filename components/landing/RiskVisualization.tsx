"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ShieldAlert, TrendingUp, Users, Target } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const data = [
  { name: '00:00', risk: 10 },
  { name: '04:00', risk: 15 },
  { name: '08:00', risk: 45 },
  { name: '12:00', risk: 30 },
  { name: '16:00', risk: 65 },
  { name: '20:00', risk: 40 },
  { name: '23:59', risk: 20 },
];

const RiskVisualization = () => {
    const { t } = useLanguage();
  return (
    <section id="analytics" className="py-24 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Content */}
          <div className="w-full lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
                <ShieldAlert className="text-blue-400 w-6 h-6" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-6">
                {'Predictive'}<span className="text-blue-400">{'Threat intellige'}</span>
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                {'Our aimodelsanal'}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { label: 'Avg Risk Score', value: '12.4', icon: Target },
                  { label: 'Threats Blocked', value: '14,209', icon: ShieldAlert },
                  { label: 'Active Sessions', value: '1,024', icon: Users },
                  { label: 'Security Uptime', value: '99.99%', icon: TrendingUp },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <stat.icon className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Visualization Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-1/2 relative"
          >
            <div className="absolute -inset-4 bg-blue-500/10 blur-3xl rounded-full -z-10"></div>
            <div className="glass-panel p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white">{'Global risk trend'}</h3>
                  <p className="text-sm text-gray-400">{'Realtime aimonit'}</p>
                </div>
                <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                  {'Livestatus'}</div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="risk" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRisk)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  {'Anomalydetectio'}</div>
                <div>{'Lastupdatedjust'}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default RiskVisualization;
