'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { NotesTab } from '@/components/workspace/NotesTab';
import { BookmarksTab } from '@/components/workspace/BookmarksTab';
import { FileText, Globe } from 'lucide-react';
import { GlobalSearch } from '@/components/SearchCommand';

export default function VaultDashboard() {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8 min-h-screen">
          <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Personal Vault</h1>
              <p className="text-gray-400">Securely store encrypted notes and manage your web bookmarks.</p>
            </div>
            <div className="w-full md:w-auto md:min-w-[300px]">
              <GlobalSearch />
            </div>
          </div>

          <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
            {/* Tabs Navigation */}
            <div className="flex gap-6 border-b border-white/10 mb-6">
              <button 
                onClick={() => setActiveTab('notes')} 
                className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'notes' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <FileText className="w-4 h-4" /> Secure Notes
                {activeTab === 'notes' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.8)]" />}
              </button>
              <button 
                onClick={() => setActiveTab('bookmarks')} 
                className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'bookmarks' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Globe className="w-4 h-4" /> Web Bookmarks
                {activeTab === 'bookmarks' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.8)]" />}
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
              {activeTab === 'notes' ? <NotesTab /> : <BookmarksTab />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
