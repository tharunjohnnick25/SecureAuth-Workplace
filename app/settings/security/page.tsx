'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { ShieldCheck, BrainCircuit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SecuritySettings() {
  const [optIn, setOptIn] = useState(true);

  const handleDeleteBiometrics = async () => {
    // Mock API call
    toast.success("Behavioral biometrics data scheduled for deletion (30-day retention policy).");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Security & Privacy Settings
        </h1>
        <p className="text-gray-400 mt-1">Manage your authentication methods and data privacy.</p>
      </div>

      <Card className="p-6 border-white/10 bg-white/5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Smart Friction (Behavioral Biometrics)</h3>
            <p className="text-sm text-gray-400 mt-1">
              Our AI Risk Engine analyzes your typing speed, device posture, and location to silently verify your identity and reduce MFA prompts when you are safe.
            </p>
            <div className="mt-4 p-4 bg-black/20 rounded-lg border border-white/5">
              <p className="text-sm text-gray-300">
                <strong>Last Login Assessment:</strong> Risk Score 15 (Low Risk). <br/>
                <span className="text-gray-500">Factors: Normal location, Recognized device.</span>
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
        </div>

        {!optIn && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            Warning: Opting out of Smart Friction means you will be prompted for Multi-Factor Authentication (MFA) on every single login.
          </div>
        )}
      </Card>

      <Card className="p-6 border-red-500/20 bg-red-500/5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            GDPR / DPDP Right to Erasure
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            You can request the deletion of your historical behavioral biometrics and location baseline data. This action cannot be undone.
          </p>
        </div>
        <button 
          onClick={handleDeleteBiometrics}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors font-medium"
        >
          Erase Behavioral Data
        </button>
      </Card>
    </div>
  );
}
