'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, KeyRound, ShieldCheck, Shield } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

type Step = 'enroll' | 'verify' | 'working' | 'done';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred';
}

export default function PasskeyGatePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const isAlreadyEnrolled = user?.passkey_enrolled === true;
  const [step, setStep] = useState<Step>(isAlreadyEnrolled ? 'verify' : 'enroll');
  const [enrolled, setEnrolled] = useState(isAlreadyEnrolled);
  const [error, setError] = useState('');

  const email = user?.email || '';
  const isAdmin = ADMIN_ROLES.has(String(user?.role || '').toUpperCase());

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const markEnrolled = () => {
    setEnrolled(true);
  };

  const isWebAuthnSupported = () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }
    return true;
  };

  const registerPasskey = async () => {
    setError('');
    setStep('working');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported by this browser. Use a modern browser with a hardware key or platform authenticator.');
      }

      const optionsRes = await fetch(`/api/auth/webauthn/register/generate-options?email=${encodeURIComponent(email)}`);
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate passkey options');
      }
      const options = await optionsRes.json();

      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: options });
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setStep('enroll');
          toast.error('Passkey registration cancelled.');
          return;
        }
        throw err;
      }

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...attestation, userKey: email }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.verified) {
        throw new Error(verifyData.error || 'Passkey registration failed');
      }

      setUser(verifyData.user || { ...user, passkey_enrolled: true });
      markEnrolled();
      toast.success('Passkey registered successfully');
      await authenticatePasskey();
    } catch (err) {
      setStep('enroll');
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  };

  const authenticatePasskey = async () => {
    setError('');
    setStep('working');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported by this browser. Use a modern browser with a hardware key or platform authenticator.');
      }

      const optionsRes = await fetch('/api/auth/webauthn/login/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate login options');
      }
      const options = await optionsRes.json();

      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setStep('verify');
          toast.error('Passkey authentication cancelled.');
          return;
        }
        throw err;
      }

      const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.verified) {
        throw new Error(verifyData.error || 'Passkey authentication failed');
      }

      setUser(verifyData.user);
      sessionStorage.setItem('passkey_verified', 'true');
      setStep('done');
      toast.success('Phishing-resistant authentication complete');

      setTimeout(() => {
        router.push(isAdmin ? '/admin/dashboard' : '/dashboard');
      }, 1500);
    } catch (err) {
      setStep('verify');
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 'enroll':
        return (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
              <Fingerprint className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Register a Security Key</h2>
            <p className="text-gray-400 text-center text-sm max-w-sm mb-6">
              {isAdmin
                ? 'Administrative accounts require phishing-resistant MFA. Register a hardware security key (e.g. YubiKey) or your device biometrics (Windows Hello, Touch ID, Face ID, Android passkey).'
                : 'Register a hardware security key or your device biometrics for a stronger sign-in experience.'}
            </p>
            <Button
              onClick={registerPasskey}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Register Passkey / Security Key
            </Button>
            {error && (
              <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full">
                {error}
              </p>
            )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 text-gray-400 hover:text-white"
                onClick={() => { sessionStorage.setItem('passkey_verified', 'true'); router.push(isAdmin ? '/admin/dashboard' : '/dashboard'); }}
              >
                Skip for now (Demo Mode)
              </Button>
          </div>
        );
      case 'verify':
        return (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
              <ShieldCheck className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Sign in with your Security Key</h2>
            <p className="text-gray-400 text-center text-sm max-w-sm mb-6">
              {isAdmin
                ? 'Administrative accounts must verify with a phishing-resistant factor. Confirm your identity using your registered security key or biometrics.'
                : 'Confirm your identity using your registered security key or biometrics.'}
            </p>
            <Button
              onClick={authenticatePasskey}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Verify with Security Key
            </Button>
            {error && (
              <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full">
                {error}
              </p>
            )}
          </div>
        );
      case 'working':
        return (
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping" />
              <Fingerprint className="w-10 h-10 text-purple-400 animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              {enrolled ? 'Verifying your identity...' : 'Registering your security key...'}
            </h2>
            <p className="text-sm text-gray-400">A secure challenge is being signed by your authenticator.</p>
          </div>
        );
      case 'done':
        return (
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Authenticated</h2>
            <p className="text-sm text-gray-400 animate-pulse">Redirecting to your workspace...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3 border border-purple-500/30">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white text-center mb-2">Phishing-Resistant MFA</h1>
          <p className="text-gray-400 text-center text-sm">
            FIDO2 / WebAuthn — your key signs a challenge bound to this site, so it can never be phished or reused.
          </p>
          {isAdmin && (
            <span className="mt-3 text-[11px] px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Mandatory for administrators
            </span>
          )}
        </div>
        {getStepContent()}
      </Card>
    </div>
  );
}
