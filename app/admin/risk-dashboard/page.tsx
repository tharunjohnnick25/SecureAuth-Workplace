'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ShieldAlert, TrendingDown, Users, Activity, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';


type RiskLog = {
  id: string;
  user_id: string;
  risk_score: number;
  risk_level: string;
  top_factors: any;
  evaluated_at: string;
};
export default function RiskDashboard() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    averageScore: 100,
    highRiskUsers: 0,
    anomaliesBlocked: 0,
    aiModelStatus: 'Active',
    recentInterventions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        const res = await fetch('/api/admin/risk-dashboard');
        const json = await res.json();
        if (json.success) {
          setChartData(json.data.chartData);
          setMetrics({
            averageScore: json.data.averageScore,
            highRiskUsers: json.data.highRiskUsers,
            anomaliesBlocked: json.data.anomaliesBlocked,
            aiModelStatus: json.data.aiModelStatus,
            recentInterventions: json.data.recentInterventions || []
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRiskData();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-blue-500 w-8 h-8" /> 
            AI Risk Intelligence
          </h1>
          <p className="text-slate-400">Continuous behavioral monitoring and machine learning risk predictions.</p>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Average Company Risk</p>
                <h3 className="text-3xl font-bold text-emerald-400 mt-2">{loading ? '...' : `${metrics.averageScore} / 100`}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">High Risk Users</p>
                <h3 className="text-3xl font-bold text-amber-500 mt-2">{loading ? '...' : metrics.highRiskUsers}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Anomalies Blocked</p>
                <h3 className="text-3xl font-bold text-red-500 mt-2">{loading ? '...' : metrics.anomaliesBlocked}</h3>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">AI Model Status</p>
                <h3 className="text-xl font-bold text-blue-400 mt-2">{loading ? '...' : metrics.aiModelStatus}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-2 shadow-xl">
          <CardHeader>
            <CardTitle>Company Risk Trend (30 Days)</CardTitle>
            <CardDescription className="text-slate-400">Aggregated ML risk scores across all active sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Explainability Log */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-500" />
              Recent AI Interventions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
            <div className="divide-y divide-slate-800">
              {loading ? (
                <div className="p-4 text-slate-400 text-sm text-center">Loading interventions...</div>
              ) : metrics.recentInterventions.length === 0 ? (
                <div className="p-4 text-slate-400 text-sm text-center">No recent AI interventions.</div>
              ) : (
                metrics.recentInterventions.map((intervention: any) => (
                  <div key={intervention.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-slate-200">{intervention.employee_id}</span>
                      <Badge variant="outline" className={`border ${
                        intervention.status === 'BLOCKED' ? 'text-red-500 border-red-500 bg-red-500/10' : 
                        intervention.status === 'FAILED' ? 'text-amber-500 border-amber-500 bg-amber-500/10' : 
                        'text-blue-500 border-blue-500 bg-blue-500/10'
                      }`}>
                        {intervention.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p><span className="text-slate-500">Alert:</span> {intervention.scoreDrop}</p>
                      <p><span className="text-slate-500">AI Explanation:</span> {intervention.explanation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}