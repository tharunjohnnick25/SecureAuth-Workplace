'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { AccessRequestsTab } from '@/components/admin/AccessRequestsTab';
import { LeaveApprovalsTab } from '@/components/admin/LeaveApprovalsTab';
import { FileCheck, Clock } from 'lucide-react';
import { GlobalSearch } from '@/components/SearchCommand';

import { useAuthStore } from '@/store/useAuthStore';

export default function RequestsDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'access' | 'leaves'>(user?.role === 'MANAGER' ? 'leaves' : 'access');

  // If user becomes a manager after load, ensure they don't get stuck on access tab
  React.useEffect(() => {
    if (user?.role === 'MANAGER' && activeTab === 'access') {
      setActiveTab('leaves');
    }
  }, [user?.role, activeTab]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8 min-h-screen">
          <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                Requests & Approvals
              </h1>
              <p className="text-gray-400">Manage employee access requests and leave applications from one place.</p>
            </div>
            <div className="w-full md:w-auto md:min-w-[300px]">
              <GlobalSearch />
            </div>
          </div>

          <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
            {/* Tabs Navigation */}
            <div className="flex gap-6 border-b border-white/10 mb-6">
              {user?.role !== 'MANAGER' && (
                <button 
                  onClick={() => setActiveTab('access')} 
                  className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'access' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <FileCheck className="w-4 h-4" /> Access Requests
                  {activeTab === 'access' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.8)]" />}
                </button>
              )}
              <button 
                onClick={() => setActiveTab('leaves')} 
                className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'leaves' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Clock className="w-4 h-4" /> Leave Approvals
                {activeTab === 'leaves' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.8)]" />}
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
              {activeTab === 'access' ? <AccessRequestsTab hideLayout={true} /> : <LeaveApprovalsTab hideLayout={true} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
