'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Search, Activity, UserX, Clock, MapPin, Laptop, ScanFace } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';


const mockSessions = [
  { id: 1, name: 'John Doe', empId: 'EMP001', score: 94, level: 'HIGH_TRUST', lastLogin: '2 mins ago', location: 'Chennai', device: 'Windows PC', anomalies: [] },
  { id: 2, name: 'Alex Smith', empId: 'EMP042', score: 72, level: 'MEDIUM_TRUST', lastLogin: '1 hour ago', location: 'Bangalore (Unusual)', device: 'MacBook', anomalies: ['Location'] },
  { id: 3, name: 'David Kumar', empId: 'EMP088', score: 38, level: 'LOW_TRUST', lastLogin: 'Just now', location: 'Mumbai', device: 'Unknown iPhone', anomalies: ['Device', 'Typing'] },
];

export default function SecurityDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const filtered = mockSessions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.empId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Security Command Center</h1>
          <p className="text-gray-400">Monitor employee trust scores and adaptive authentication events.</p>
        </div>
        <div className="flex gap-4">
          <Card className="p-4 flex items-center gap-4 bg-emerald-500/10 border-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-sm text-gray-400">High Trust</p>
              <p className="text-xl font-bold text-emerald-400">142</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 bg-red-500/10 border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-sm text-gray-400">High Risk</p>
              <p className="text-xl font-bold text-red-400">1</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Table */}
        <Card className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
            <div className="w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                placeholder="Search employees..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  <th className="pb-3 px-4 font-medium">Employee</th>
                  <th className="pb-3 px-4 font-medium">Trust Score</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                  <th className="pb-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((session) => (
                  <tr 
                    key={session.id} 
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setSelectedSession(session)}
                  >
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-200">{session.name}</p>
                      <p className="text-xs text-gray-500">{session.empId}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              session.score >= 80 ? 'bg-emerald-400' :
                              session.score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${session.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-300">{session.score}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        session.level === 'HIGH_TRUST' ? 'bg-emerald-500/20 text-emerald-400' :
                        session.level === 'MEDIUM_TRUST' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {session.level.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Side Panel for Details */}
        {selectedSession && (
          <Card className="w-80 p-6 flex flex-col border-cyan-500/30">
            <h3 className="text-lg font-bold text-white mb-1">{selectedSession.name}</h3>
            <p className="text-sm text-gray-400 mb-6">{selectedSession.empId}</p>

            <div className={`p-4 rounded-xl mb-6 border ${
              selectedSession.level === 'HIGH_TRUST' ? 'bg-emerald-500/10 border-emerald-500/20' :
              selectedSession.level === 'MEDIUM_TRUST' ? 'bg-amber-500/10 border-amber-500/20' : 
              'bg-red-500/10 border-red-500/20'
            }`}>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Trust Score</p>
              <p className={`text-4xl font-bold ${
                selectedSession.level === 'HIGH_TRUST' ? 'text-emerald-400' :
                selectedSession.level === 'MEDIUM_TRUST' ? 'text-amber-400' : 'text-red-400'
              }`}>{selectedSession.score}</p>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-300 border-b border-white/10 pb-2">Session Details</h4>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2"><Clock className="w-4 h-4"/> Last Login</span>
                <span className="text-white">{selectedSession.lastLogin}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2"><MapPin className="w-4 h-4"/> Location</span>
                <span className={selectedSession.anomalies.includes('Location') ? 'text-amber-400 font-semibold' : 'text-white'}>
                  {selectedSession.location}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2"><Laptop className="w-4 h-4"/> Device</span>
                <span className={selectedSession.anomalies.includes('Device') ? 'text-amber-400 font-semibold' : 'text-white'}>
                  {selectedSession.device}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2"><ScanFace className="w-4 h-4"/> Face Match</span>
                <span className="text-emerald-400">96%</span>
              </div>
            </div>

            <div className="mt-auto space-y-3">
              {selectedSession.level === 'LOW_TRUST' && (
                <Button className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50">
                  <UserX className="w-4 h-4 mr-2" /> Revoke Access
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => setSelectedSession(null)}>
                Close
              </Button>
            </div>
          </Card>
        )}
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}