'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldX, Lock, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import type { RiskAssessment } from '@/lib/risk';

export default function BlockedLoginPage() {
  const router = useRouter();
  const [risk, setRisk] = useState<RiskAssessment | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingRisk');
      if (raw) setRisk(JSON.parse(raw));
    } catch {
      // Ignore malformed state.
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative p-8 border-red-500/30 bg-[#0a0a16]/80 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Login Blocked</h1>
          <p className="text-gray-400 text-center text-sm">
            This login attempt was denied by the adaptive risk engine. Contact your administrator to proceed.
          </p>
        </div>

        {risk && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">Risk score</span>
              <span className="text-2xl font-mono font-bold text-red-400">{risk.score}/100</span>
            </div>

            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full"
                style={{ width: `${Math.min(risk.score, 100)}%` }}
              />
            </div>

            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Anomaly signals detected:
            </p>
            <ul className="space-y-1">
              {(risk.reasons.length > 0 ? risk.reasons : ['Extreme risk score']).map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-xs text-red-300">
                  <Lock className="w-3 h-3 mt-0.5 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/login')}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white"
          >
            Return to Login
          </Button>
        </div>
      </Card>
    </div>
  );
}
