'use client';

import { useState } from 'react';
import { Shield, Smartphone, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from '@/store/useAuthStore';

type SetupStep = 'choose' | 'totp' | 'recovery' | 'complete';

export default function MfaSetupPage() {
    const { t } = useLanguage();
  const [step, setStep] = useState<SetupStep>('choose');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const { user } = useAuthStore();

  const enableTotp = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFactorId(data.id);
      setQrCode(data.totp?.qr_code || '');
      setSecret(data.totp?.secret || '');
      setStep('totp');
      toast.success('Authenticator app configured');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRecoveryCodes(data.recoveryCodes || []);
      setStep('recovery');
      toast.success('MFA enabled successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('Recovery codes copied to clipboard');
  };

  const finishTotpSetup = () => {
    setStep('complete');
    setTimeout(() => {
        const pendingAuth = sessionStorage.getItem('pendingAuthUser');
        if (pendingAuth) {
           window.location.href = '/verify-mfa';
        } else {
           window.location.href = '/settings/security';
        }
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold mb-2">Set up MFA</h1>
          <p className="text-gray-400 text-center text-sm">
            Enhance your account security</p>
        </div>

        {step === 'choose' && (
          <div className="space-y-4">
            <button
              onClick={enableTotp}
              disabled={loading}
              className="w-full p-4 rounded-xl border border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-cyan-500/5 transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Authenticator App</p>
                <p className="text-xs text-gray-400">Use Google Authenticator, Authy, or similar apps</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/mfa-setup/passkey'}
              className="w-full p-4 rounded-xl border border-white/10 hover:border-purple-500/50 bg-white/5 hover:bg-purple-500/5 transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Security Key (Passkey)</p>
                <p className="text-xs text-gray-400">Use device biometrics or a hardware key</p>
              </div>
            </button>
          </div>
        )}

        {step === 'totp' && (
          <div className="space-y-6">
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <p className="text-sm text-cyan-400 font-medium mb-2">{'Scan qrcode'}</p>
              <p className="text-xs text-gray-400">
                {'Openyourauthent'}</p>
            </div>

            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-xl border border-white/10" />
              </div>
            )}

            {secret && (
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">{'Secret key'}</p>
                <p className="text-sm font-mono text-cyan-400 break-all">{secret}</p>
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm text-gray-300">{'Verification cod'}</label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-2xl tracking-widest py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:border-cyan-500/50 outline-none font-mono"
                placeholder="000000"
              />
            </div>

            <Button
              onClick={verifyTotp}
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
              size="lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Enable'}
            </Button>
          </div>
        )}

        {step === 'recovery' && (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-sm text-yellow-400 font-medium mb-2">{'Save recovery cod'}</p>
              <p className="text-xs text-gray-400">
                {'Storethesecodes'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code, i) => (
                <div key={i} className="p-2 bg-white/5 rounded-lg font-mono text-xs text-gray-300 text-center">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={copyCodes} variant="outline" className="flex-1">
                Copy codes</Button>
              <Button onClick={finishTotpSetup} className="flex-1">
                Complete Setup</Button>
            </div>
          </div>
        )}


        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <p className="text-emerald-400 font-semibold">{'Mfaenabled succe'}</p>
            <p className="text-xs text-gray-400">{'Redirectingtose'}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
