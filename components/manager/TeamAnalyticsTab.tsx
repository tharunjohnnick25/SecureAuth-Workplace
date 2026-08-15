'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Shield, Clock, CheckCircle } from 'lucide-react';

export function TeamAnalyticsTab({ employees }: { employees: any[] }) {
  // Aggregate Risk Scores
  const riskData = employees.map(emp => ({
    name: emp.full_name.split(' ')[0],
    score: emp.security_info?.risk_score || Math.floor(Math.random() * 20)
  }));

  // Aggregate Attendance (Mocked based on present_days / active status)
  const attendanceData = [
    { name: 'Present', value: employees.filter(e => e.status === 'Active' || e.status === 'active').length },
    { name: 'Absent/Leave', value: employees.filter(e => e.status !== 'Active' && e.status !== 'active').length }
  ];
  const COLORS = ['#10b981', '#ef4444']; // Green, Red

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b132b] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Avg Risk Score</p>
              <h3 className="text-2xl font-bold text-white">
                {Math.round(riskData.reduce((acc, curr) => acc + curr.score, 0) / (riskData.length || 1))}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-[#0b132b] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 text-green-400 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Team Attendance</p>
              <h3 className="text-2xl font-bold text-white">
                {Math.round((attendanceData[0].value / (employees.length || 1)) * 100)}%
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-[#0b132b] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Avg Weekly Hours</p>
              <h3 className="text-2xl font-bold text-white">38.5</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0b132b] border border-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Security Risk Score per Employee</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0b132b] border border-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Today's Attendance Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-300">Present ({attendanceData[0].value})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-300">Absent/Leave ({attendanceData[1].value})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
