'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Loader2, ShieldAlert, Zap, LogIn, Laptop, Users, FileText, Activity, RefreshCw, Radio, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#22c55e',
  Info: '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
};

interface VisualsData {
  stats: Record<string, number>;
  eventsBySeverity: { name: string; value: number }[];
  eventsByStatus: { name: string; value: number }[];
  eventsByType: { name: string; value: number }[];
  eventsOverTime: { name: string; value: number }[];
  loginsOverTime: { name: string; value: number }[];
  riskBuckets: { name: string; value: number }[];
  roles: { name: string; value: number }[];
  recentActivity: { id: string; title: string; time: string; status: 'success' | 'warning' | 'danger' | 'info' }[];
}

interface LiveEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  table: string;
}

const LIVE_TABLES = ['security_events', 'login_history', 'threat_logs', 'office_access_logs'];

function buildLiveEvent(table: string, payload: any): LiveEvent | null {
  const row = payload.new || payload.old || {};
  const id = row.id || `${table}-${Date.now()}`;
  const time = new Date(row.created_at || row.timestamp || Date.now()).toLocaleTimeString();

  if (table === 'security_events') {
    const sev = String(row.severity || 'medium').toLowerCase();
    const status = sev === 'critical' || sev === 'high' ? 'danger' : sev === 'medium' ? 'warning' : 'info';
    return { id, title: (row.event_type || 'Security event').replace(/_/g, ' '), detail: `Severity: ${row.severity || 'medium'}`, time, status: status as any, table: 'Security Event' };
  }

  if (table === 'login_history') {
    const ok = String(row.status || '').toUpperCase() === 'SUCCESS';
    return { id, title: ok ? 'Successful login' : 'Failed login attempt', detail: `Risk: ${row.risk_level || 'low'}`, time, status: ok ? 'success' : 'danger', table: 'Login' };
  }

  if (table === 'threat_logs') {
    const sev = String(row.severity || 'medium').toLowerCase();
    const status = sev === 'critical' || sev === 'high' ? 'danger' : sev === 'medium' ? 'warning' : 'info';
    return { id, title: (row.threat_type || 'Threat').replace(/_/g, ' '), detail: `Severity: ${row.severity || 'medium'}`, time, status: status as any, table: 'Threat' };
  }

  if (table === 'office_access_logs') {
    const type = String(row.access_type || 'ENTRY').toUpperCase();
    return { id, title: type === 'ENTRY' ? 'Office check-in' : 'Office check-out', detail: row.location ? `Location: ${row.location}` : 'Location: N/A', time, status: 'success' as const, table: 'Office' };
  }

  return null;
}

export function SecurityVisualsTab() {
  const [data, setData] = useState<VisualsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/security/visuals');
      const json = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error || 'Failed to load visuals');
      if (mounted.current) {
        setData(json.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (e: any) {
      if (mounted.current) setError(e.message || 'Failed to load security visuals');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => fetchData(true), 800);
  }, [fetchData]);

  useEffect(() => {
    mounted.current = true;
    fetchData();

    const supabase = createClient();
    const handleChange = (table: string) => (payload: any) => {
      if (!mounted.current) return;
      if (payload.eventType === 'INSERT') {
        const evt = buildLiveEvent(table, payload);
        if (evt) {
          setLiveEvents((prev) => [evt, ...prev].slice(0, 8));
        }
      }
      scheduleRefetch();
    };

    const channel = supabase
      .channel('security-hub-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_events' }, handleChange('security_events'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_history' }, handleChange('login_history'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threat_logs' }, handleChange('threat_logs'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_access_logs' }, handleChange('office_access_logs'))
      .subscribe((status) => {
        if (mounted.current) setConnected(status === 'SUBSCRIBED');
      });

    const pollTimer = setInterval(() => fetchData(true), 20000);

    return () => {
      mounted.current = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchData, scheduleRefetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-blue-400" />
        Loading security telemetry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center text-gray-400 min-h-[200px] flex items-center justify-center">
        {error || 'No security data available.'}
      </Card>
    );
  }

  const { stats, eventsBySeverity, eventsByStatus, eventsByType, eventsOverTime, loginsOverTime, riskBuckets, roles, recentActivity } = data;

  const combinedActivity = [...liveEvents.map((e) => ({ id: e.id, title: e.title, time: e.time, status: e.status })), ...recentActivity].slice(0, 10);

  const statCards = [
    { title: 'Open Security Events', value: stats.openEvents, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'border-red-500/20', accent: '#ef4444' },
    { title: 'Avg Risk Score', value: stats.avgRisk, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'border-amber-500/20', accent: '#f59e0b' },
    { title: 'Successful Logins', value: stats.successfulLogins, icon: LogIn, color: 'text-green-400', bg: 'bg-green-500/10', ring: 'border-green-500/20', accent: '#22c55e' },
    { title: 'Failed Logins', value: stats.failedLogins, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'border-yellow-500/20', accent: '#eab308' },
    { title: 'Active Sessions', value: stats.activeSessions, icon: Laptop, color: 'text-cyan-400', bg: 'bg-cyan-500/10', ring: 'border-cyan-500/20', accent: '#06b6d4' },
    { title: 'Team Members', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'border-blue-500/20', accent: '#3b82f6' },
    { title: 'Audit Events', value: stats.auditEvents, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'border-purple-500/20', accent: '#a855f7' },
    { title: 'Active Tasks', value: stats.activeTasks, icon: Activity, color: 'text-pink-400', bg: 'bg-pink-500/10', ring: 'border-pink-500/20', accent: '#ec4899' },
  ];

  return (
    <div className="space-y-6">
      {/* Live header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${connected ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-gray-600/50 bg-white/5 text-gray-400'}`}>
            <span className="relative flex h-2 w-2">
              {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            </span>
            {connected ? 'Live' : 'Offline'}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            Realtime stream: {LIVE_TABLES.join(', ')}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-5 bg-black/40 backdrop-blur-xl border-white/10 hover:border-blue-500/30 transition-all group relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-25 transition-opacity" style={{ background: s.accent }} />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.title}</h3>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.bg} ${s.ring}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{s.value}</p>
              <div className="mt-3 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ background: s.accent }} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Live event stream banner */}
      <Card className="p-5 bg-black/40 backdrop-blur-xl border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            Live Event Stream
          </h3>
          <span className="text-[10px] text-gray-500 font-mono">SUPABASE REALTIME</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <AnimatePresence initial={false}>
            {liveEvents.length === 0 ? (
              <div className="col-span-full text-sm text-gray-500 flex items-center gap-2 py-2">
                <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-green-500" />
                Watching for new events — they will stream in here in realtime.
              </div>
            ) : (
              liveEvents.slice(0, 4).map((evt) => (
                <motion.div
                  key={evt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl border border-white/5 bg-white/5"
                >
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: STATUS_COLORS[evt.status] || '#3b82f6' }} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-100 truncate font-medium">{evt.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{evt.detail}</p>
                    <p className="text-[10px] text-gray-600 font-mono mt-0.5">{evt.table} · {evt.time}</p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Row: area chart + severity donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Security Events — Last 14 Days</h3>
            <span className="text-xs text-gray-500">{stats.totalEvents} total events</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eventsOverTime}>
                <defs>
                  <linearGradient id="secArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} cursor={{ stroke: '#ffffff20' }} />
                <Area type="monotone" dataKey="value" name="Events" stroke="#ef4444" strokeWidth={2.5} fill="url(#secArea)" animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Events by Severity</h3>
          {eventsBySeverity.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">No events recorded</p>
          ) : (
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eventsBySeverity} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} animationDuration={600}>
                    {eventsBySeverity.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.name] || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white tabular-nums">{stats.openEvents}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Open</span>
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {eventsBySeverity.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEVERITY_COLORS[s.name] || '#3b82f6' }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Row: logins trend + risk buckets + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Logins — Last 14 Days</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loginsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" name="Logins" fill="#06b6d4" radius={[4, 4, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Risk Score Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" name="Users" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <div className="flex items-center gap-2">
              {connected && <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live</span>}
              <span className="text-xs text-gray-500">Latest {combinedActivity.length}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {combinedActivity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-16">No recent activity</p>
            ) : (
              <AnimatePresence initial={false}>
                {combinedActivity.map((act, i) => (
                  <motion.div
                    key={`${act.id}-${i}`}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg border border-white/5"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      act.status === 'danger' ? 'bg-red-500' : act.status === 'warning' ? 'bg-yellow-500' : act.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{act.title}</p>
                      <p className="text-[11px] text-gray-500">{act.time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </Card>
      </div>

      {/* Row: event types + status + roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Top Event Types</h3>
          {eventsByType.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No events recorded</p>
          ) : (
            <div className="flex flex-col gap-3">
              {eventsByType.slice(0, 6).map((t, i) => {
                const max = eventsByType[0].value || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="truncate">{t.name}</span>
                      <span>{t.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(t.value / max) * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Event Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsByStatus} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" name="Events" fill="#3b82f6" radius={[0, 4, 4, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">Team Composition</h3>
          {roles.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No data</p>
          ) : (
            <div className="flex flex-col gap-3">
              {roles.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{r.name}</span>
                  <span className="text-white font-bold tabular-nums">{r.value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Pending Approvals</span>
              <span className="text-white font-bold tabular-nums">{stats.pendingApprovals}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
