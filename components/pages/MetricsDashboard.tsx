'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';

import { PageHeader } from '@/components/PageHeader';

import Link from 'next/link';
import { useLanguage } from "@/context/LanguageContext";

interface MetricCard {
  title: string;
  value: string | number;
  trend?: string;
  icon?: any;
  trendUp?: boolean;
  href?: string;
}

interface MetricsDashboardProps {
  title: string;
  description: string;
  metrics: MetricCard[];
  chartData: any[];
  barData?: any[];
  recentActivity?: { id: string; title: string; time: string; status: 'success' | 'warning' | 'danger' }[];
  hideLayout?: boolean;
}

export function MetricsDashboard({ title, description, metrics, chartData, barData, recentActivity, hideLayout }: MetricsDashboardProps) {
    const { t } = useLanguage();

  const content = (
    <div className="w-full overflow-x-hidden space-y-8">
      <PageHeader title={title} description={description} hideSearch={hideLayout} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
              >
                <Link href={m.href || '#'}>
                  <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10 hover:border-blue-500/30 transition-all hover:scale-[1.02] cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-sm font-medium text-gray-400">{m.title}</h3>
                      {m.icon && <m.icon className="w-5 h-5 text-blue-400" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{m.value}</span>
                      {m.trend && (
                        <span className={`text-xs font-semibold ${m.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                          {m.trend}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2 p-6 bg-black/40 backdrop-blur-xl border-white/10">
              <h3 className="text-lg font-bold mb-6">{'Activity trends'}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
              <h3 className="text-lg font-bold mb-6">{'Distribution'}</h3>
              {barData ? (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {recentActivity && recentActivity.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h4>
                      <div className="flex flex-col gap-2">
                        {recentActivity.slice(0, 3).map((act, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${
                              act.status === 'success' ? 'bg-green-500' : act.status === 'danger' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200 truncate">{act.title}</p>
                              <p className="text-xs text-gray-500">{act.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  {recentActivity?.map((act, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                      <div className={`w-2 h-2 rounded-full ${
                        act.status === 'success' ? 'bg-green-500' : act.status === 'danger' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{act.title}</p>
                        <p className="text-xs text-gray-500">{act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24">
          {content}
        </main>
      </div>
    </div>
  );
}

