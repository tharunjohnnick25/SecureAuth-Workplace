'use client';

import { useRiskScore } from '@/hooks/useRiskScore';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ShieldCheck, History, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { useLanguage } from "@/context/LanguageContext";

export default function RiskDashboard() {
    const { t } = useLanguage();
  const { data, loading, error } = useRiskScore();
  const { user } = useAuthStore();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1,2,3].map(i => (
          <div key={i} className="h-40 glass-panel rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">{'Error loading dashboard: '}{error}</div>;
  }

  const { currentRisk, alerts, recentHistory } = data || {};
  const riskColor = currentRisk?.risk_level === 'critical' || currentRisk?.risk_level === 'high' 
    ? 'text-red-500' 
    : currentRisk?.risk_level === 'medium' ? 'text-yellow-400' : 'text-[var(--color-cyber-green)]';

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-medium">{'Current risk score'}</h3>
            <Activity className={riskColor} />
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-5xl font-bold ${riskColor}`}>{currentRisk?.score || 0}</span>
            <span className="text-sm text-gray-500 mb-1 uppercase">/ 100</span>
          </div>
          <p className="mt-4 text-sm text-gray-400 capitalize flex items-center gap-2">
            {'Status'}<span className={riskColor}>{currentRisk?.risk_level || 'Low'} {'Risk'}</span>
          </p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-medium">{'Active alerts'}</h3>
            <AlertTriangle className="text-[var(--color-cyber-purple)]" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold text-white">{alerts?.length || 0}</span>
          </div>
          <p className="mt-4 text-sm text-gray-400 capitalize">
            {'Unread security notifications'}</p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-medium">{'Protection status'}</h3>
            <ShieldCheck className="text-[var(--color-cyber-blue)]" />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">{'Mfaenabled'}</span>
              <span className="text-[var(--color-cyber-green)] font-bold">{'Yes'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">{'Adaptive auth'}</span>
              <span className="text-[var(--color-cyber-green)] font-bold">{'Active'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">{'Zero trust'}</span>
              <span className="text-[var(--color-cyber-green)] font-bold">{'Enforced'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent History */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <History className="text-[var(--color-cyber-blue)]" />
            <h3 className="text-xl font-bold">{'Authentication log'}</h3>
          </div>
          <div className="space-y-4">
            {recentHistory?.length === 0 ? (
              <p className="text-gray-500 text-sm">{'No recent login history'}</p>
            ) : (
              recentHistory?.map((log: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <p className="text-sm font-medium">{log.ip_address}</p>
                    <p className="text-xs text-gray-500">{format(new Date(log.created_at), 'PP p')}</p>
                  </div>
                  <div>
                    {log.status === 'success' && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">{'Success'}</span>}
                    {log.status === 'failed' && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">{'Failed'}</span>}
                    {log.status === 'mfa_required' && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">{'Mfa'}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Alerts List */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <AlertTriangle className="text-[var(--color-cyber-purple)]" />
            <h3 className="text-xl font-bold">{'Security alerts'}</h3>
          </div>
          <div className="space-y-4">
            {alerts?.length === 0 ? (
              <p className="text-gray-500 text-sm">{'No active security alerts'}</p>
            ) : (
              alerts?.map((alert: any) => (
                <div key={alert.id} className="p-4 rounded-lg bg-black/40 border border-red-500/20 flex gap-4">
                  <div className="mt-1">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white capitalize">{alert.type.replace('_', ' ')}</h4>
                    <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                    <span className="text-xs text-gray-500 mt-2 block">{format(new Date(alert.created_at), 'PP p')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
