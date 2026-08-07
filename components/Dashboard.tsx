'use client';
import React, { useState, useEffect } from 'react';
import { DashboardService } from "@/lib/services/dashboard";
import {
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Lock,
  Key,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";

const authData = [
  { name: "Mon", success: 2400, failed: 24 },
  { name: "Tue", success: 1398, failed: 32 },
  { name: "Wed", success: 9800, failed: 18 },
  { name: "Thu", success: 3908, failed: 45 },
  { name: "Fri", success: 4800, failed: 28 },
  { name: "Sat", success: 3800, failed: 12 },
  { name: "Sun", success: 4300, failed: 15 },
];

const accessData = [
  { name: "Admin", value: 15, color: "#3B82F6" },
  { name: "Manager", value: 45, color: "#10B981" },
  { name: "Developer", value: 120, color: "#8B5CF6" },
  { name: "User", value: 320, color: "#F59E0B" },
];

const recentActivities = [
  {
    id: 1,
    user: "john.doe@enterprise.com",
    action: "Login successful",
    timestamp: "2 minutes ago",
    status: "success",
    ip: "192.168.1.45",
  },
  {
    id: 2,
    user: "jane.smith@enterprise.com",
    action: "Failed MFA verification",
    timestamp: "5 minutes ago",
    status: "warning",
    ip: "10.0.0.123",
  },
  {
    id: 3,
    user: "admin@enterprise.com",
    action: "Role updated for user",
    timestamp: "12 minutes ago",
    status: "info",
    ip: "172.16.0.50",
  },
  {
    id: 4,
    user: "bob.wilson@enterprise.com",
    action: "Password reset requested",
    timestamp: "18 minutes ago",
    status: "info",
    ip: "192.168.1.78",
  },
  {
    id: 5,
    user: "attacker@external.com",
    action: "Multiple failed login attempts",
    timestamp: "23 minutes ago",
    status: "danger",
    ip: "203.0.113.45",
  },
];

const securityAlerts = [
  {
    id: 1,
    type: "High Risk",
    message: "Unusual login pattern detected from IP 203.0.113.45",
    severity: "high",
    time: "15 minutes ago",
  },
  {
    id: 2,
    type: "Medium Risk",
    message: "3 users with expired passwords",
    severity: "medium",
    time: "1 hour ago",
  },
  {
    id: 3,
    type: "Low Risk",
    message: "Session timeout configuration changed",
    severity: "low",
    time: "2 hours ago",
  },
];

export function Dashboard() {
    const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, act, al] = await Promise.all([
          DashboardService.getStats(),
          DashboardService.getRecentActivities(),
          DashboardService.getSecurityAlerts()
        ]);
        setStats(s);
        setActivities(act);
        setAlerts(al);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[300px] bg-white/5 rounded-lg animate-pulse" />
          <div className="h-[300px] bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-semibold text-white">
          {'Security dashboa'}</h2>
        <p className="text-gray-400 mt-1">
          {'Realtimeovervie'}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">{'Total users'}</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.totalUsers || 0}</p>
              <p className="text-sm text-blue-400 mt-2 flex items-center gap-1 font-semibold">
                <Shield className="w-4 h-4" />
                <span>{'Active protectio'}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">{'Active sessions'}</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.activeSessions || 0}</p>
              <p className="text-sm text-green-400 mt-2 flex items-center gap-1 font-semibold">
                <Activity className="w-4 h-4" />
                <span>{'Live traffic'}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">{'Failed attempts'}</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.failedAttempts || 0}</p>
              <p className="text-sm text-red-400 mt-2 font-semibold">{t('Last24hours_43')}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">{'Mfacoverage'}</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.mfaEnabledPercent || 0}%</p>
              <p className="text-sm text-purple-400 mt-2 flex items-center gap-1 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>{'Zero trust active'}</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authentication Trends */}
        <div className="glass-card p-6 rounded-xl border border-white/10 bg-[#0A0F1D]">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            {'Authentication a'}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={authData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="success"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 4 }}
                name="Successful"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#EF4444"
                strokeWidth={3}
                dot={{ fill: '#EF4444', r: 4 }}
                name="Failed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Roles Distribution */}
        <div className="glass-card p-6 rounded-xl border border-white/10 bg-[#0A0F1D]">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            {'Role distributio'}</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={accessData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {accessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Security Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Security Alerts */}
        <div className="glass-card rounded-xl border border-white/10 bg-[#0A0F1D] overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-amber-500" />
               {'Security alerts'}</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {alerts.length > 0 ? alerts.map((alert) => (
              <div key={alert.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 shadow-[0_0_10px_currentColor] ${
                      alert.severity === "high" || alert.severity === "critical"
                        ? "text-red-500 bg-red-500"
                        : alert.severity === "medium"
                        ? "text-amber-500 bg-amber-500"
                        : "text-blue-500 bg-blue-500"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-sm font-bold uppercase tracking-wider ${
                          alert.severity === "high" || alert.severity === "critical"
                            ? "text-red-400"
                            : alert.severity === "medium"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      >
                        {alert.type}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center">
                 <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4 opacity-50" />
                 <p className="text-gray-500 text-sm">{'Nosecuritythrea'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-xl border border-white/10 bg-[#0A0F1D] overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              {'Recent activity'}</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {activities.length > 0 ? activities.map((activity) => (
              <div key={activity.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white tracking-tight">
                      {activity.user}
                    </p>
                    <p className="text-sm text-gray-400 mt-1 font-medium">
                      {activity.action}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                         {'Ip'}{activity.ip}
                       </p>
                       <span className="text-[10px] text-gray-600 font-bold">{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${
                      activity.status === "success"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center">
                 <p className="text-gray-500 text-sm">{'Norecentactivit'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
