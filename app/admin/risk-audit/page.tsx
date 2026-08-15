'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { ShieldAlert, Download, Search, Filter } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';


export default function RiskAuditDashboard() {
  const [logs] = useState([
    { id: '1', user: 'employee@test', score: 85, level: 'high', reasons: 'New/Unrecognized Device, Unusual Location', time: new Date().toISOString() },
    { id: '2', user: 'manager@test', score: 45, level: 'medium', reasons: 'Anomalous Typing Rhythm', time: new Date().toISOString() },
    { id: '3', user: 'admin@test', score: 15, level: 'low', reasons: 'Normal behavior pattern', time: new Date().toISOString() },
  ]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
            AI Risk Engine Audit
          </h1>
          <p className="text-gray-400">Monitor real-time behavioral biometrics and risk evaluations.</p>
        </div>
        <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export DPIA Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <h3 className="text-red-400 text-sm font-medium">High Risk Logins (24h)</h3>
          <p className="text-3xl font-bold text-white mt-2">12</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <h3 className="text-yellow-400 text-sm font-medium">Medium Risk Logins (24h)</h3>
          <p className="text-3xl font-bold text-white mt-2">45</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <h3 className="text-emerald-400 text-sm font-medium">Low Risk Logins (24h)</h3>
          <p className="text-3xl font-bold text-white mt-2">1,284</p>
        </Card>
      </div>

      <Card className="p-0 border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex gap-4 bg-white/5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by user email..." className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-gray-300">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="p-4 font-medium">Timestamp</th>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Risk Score</th>
              <th className="p-4 font-medium">Explainability (SHAP Factors)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-gray-400">{new Date(log.time).toLocaleTimeString()}</td>
                <td className="p-4 text-white">{log.user}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    log.level === 'high' ? 'bg-red-500/20 text-red-400' :
                    log.level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {log.score}/100 ({log.level})
                  </span>
                </td>
                <td className="p-4 text-gray-300">{log.reasons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
          </div>
        </main>
      </div>
    </div>
  );
}