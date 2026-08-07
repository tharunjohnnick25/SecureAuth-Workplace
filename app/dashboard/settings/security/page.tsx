'use client';

import React from 'react';
import { PasskeyManager } from '@/components/auth/PasskeyManager';
import { Shield } from 'lucide-react';

export default function SecuritySettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Shield className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Security Settings</h1>
          <p className="text-slate-400">Manage your authentication methods and credentials.</p>
        </div>
      </div>

      <PasskeyManager />
      
      {/* Other security settings could go here (e.g. Password Reset, TOTP, Active Sessions) */}
    </div>
  );
}
