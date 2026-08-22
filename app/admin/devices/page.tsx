'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Smartphone, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDevicesPage() {
  const [devices, setDevices] = React.useState([
    { id: 'dev_1', user: 'Tharun', type: 'YubiKey 5 NFC', status: 'ACTIVE', lastUsed: '2026-08-15', trusted: true },
    { id: 'dev_2', user: 'Oviya', type: 'Google Titan', status: 'REVOKED', lastUsed: '2026-08-10', trusted: false },
  ]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8 min-h-screen max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Smartphone className="text-primary w-8 h-8" />
                Hardware Tokens
              </h1>
              <p className="text-gray-400 mt-2">Manage employee hardware tokens and trusted devices.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-xl shadow-lg hover:bg-primary/90 transition">
              <Plus className="w-5 h-5" />
              Register Token
            </button>
          </div>

          <div className="bg-[#0a0f1c]/90 border border-white/10 rounded-2xl p-6 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Token Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Used</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((dev) => (
                  <tr key={dev.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-bold text-white">{dev.user}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      {dev.type}
                    </td>
                    <td className="px-6 py-4">
                      {dev.status === 'ACTIVE' ? (
                        <span className="px-2 py-1 bg-success/20 text-success text-xs font-bold rounded flex items-center gap-1 w-max">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs font-bold rounded flex items-center gap-1 w-max">
                          <XCircle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{dev.lastUsed}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
