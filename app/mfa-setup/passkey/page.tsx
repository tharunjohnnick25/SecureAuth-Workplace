'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, KeyRound, ShieldCheck, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

export default function PasskeySetupPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<'enroll' | 'working' | 'done'>('enroll');
  const [error, setError] = useState('');

  useEffect(() => {
    const pendingAuth = sessionStorage.getItem('pendingAuthUser');
    if (!user && !pendingAuth) {
      router.replace('/login');
    }
  }, [user, router]);

  const registerPasskey = async () => {
    setError('');
    setStep('working');
    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported by this browser. Use a modern browser with a hardware key or platform authenticator.');
      }

      // 1. Get registration options
      const optionsRes = await fetch(`/api/auth/passkey/register/options`, { method: 'POST' });
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate passkey options.');
      }
      const options = await optionsRes.json();

      // 2. Start WebAuthn registration
      let attestation;
      try {
        attestation = await startRegistration(options);
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setStep('enroll');
          toast.error('Passkey registration cancelled.');
          return;
        }
        throw err;
      }

      // 3. Verify response on server
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation, name: 'My Passkey' }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Passkey registration failed');
      }

      const pendingAuthStr = sessionStorage.getItem('pendingAuthUser');
      
      if (user) {
          setUser({ ...user, passkey_enabled: true } as any);
      } else if (pendingAuthStr) {
          try {
              const pendingUser = JSON.parse(pendingAuthStr);
              pendingUser.passkey_enabled = true;
              sessionStorage.setItem('pendingAuthUser', JSON.stringify(pendingUser));
          } catch(e) {}
      }

      setStep('done');
      toast.success('Passkey registered successfully');
      
      setTimeout(() => {
        const pendingAuth = sessionStorage.getItem('pendingAuthUser');
        if (pendingAuth) {
           window.location.href = '/verify-mfa';
        } else {
           router.push('/settings/security');
        }
      }, 1500);
    } catch (err: any) {
      setStep('enroll');
      setError(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'An unexpected error occurred');
    }
  };

  // Render UI as long as we have either a full user or a pending auth user
  useEffect(() => {
      const pendingAuth = sessionStorage.getItem('pendingAuthUser');
      if (!user && !pendingAuth) {
         // Should be caught by the first useEffect, but just in case
      }
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <Card className="w-full max-w-md p-8 relative">
        <button 
          onClick={() => router.push('/settings/security')}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6 mt-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3 border border-cyan-500/30">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white text-center mb-2">Register a Passkey</h1>
          <p className="text-gray-400 text-center text-sm">
            FIDO2 / WebAuthn provides phishing-resistant, passwordless authentication using your device biometrics or a security key.
          </p>
        </div>

        {step === 'enroll' && (
          <div className="flex flex-col items-center py-6">
            <Button
              onClick={registerPasskey}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold h-12"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Add Passkey
            </Button>
            {error && (
              <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full">
                {error}
              </p>
            )}
          </div>
        )}

        {step === 'working' && (
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping" />
              <Fingerprint className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Registering your security key...
            </h2>
            <p className="text-sm text-gray-400">Please follow the prompt on your screen.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Passkey Registered</h2>
            <p className="text-sm text-gray-400 animate-pulse">Redirecting to settings...</p>
          </div>
        )}
      </Card>
    </div>
  );
}
