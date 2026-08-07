'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useLanguage } from "@/context/LanguageContext";

export default function MfaForm() {
    const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { riskLevel, clearBiometricRequirement } = useAuthStore();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }), // In a real app we'd pass factorId too
      });

      if (!res.ok) throw new Error('Invalid verification code');

      clearBiometricRequirement();
      // Wait for auth session to establish then push
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-8 glass-panel relative overflow-hidden"
    >
      {riskLevel === 'critical' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
      )}
      
      <div className="flex flex-col items-center mb-6">
        <ShieldAlert className={`w-12 h-12 mb-4 ${riskLevel === 'critical' ? 'text-red-500 animate-pulse' : 'text-[var(--color-cyber-purple)]'}`} />
        <h2 className="text-2xl font-bold text-white">{'Mfachallenge'}</h2>
        {riskLevel && (
          <p className="text-xs text-center mt-2 text-gray-400">
            {'Risklevel'}<span className={`uppercase font-bold ${riskLevel === 'high' || riskLevel === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>{riskLevel}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-sm text-center text-gray-300 mb-4">
            {t('Enterthe6digitc_372')}</label>
          <div className="flex justify-center">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-48 text-center text-2xl tracking-widest py-3 glass-input font-mono"
              placeholder="000000"
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-400 text-center">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-3 btn-cyber disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Identity'}
        </button>
      </form>
    </motion.div>
  );
}
