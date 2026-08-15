'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldCheck, AlertTriangle, Phone, RefreshCw, MessageSquareText, ScanFace } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { toast } from 'sonner';
import { FaceCapturePanel, type FaceCaptureResult } from '@/components/face/FaceCapturePanel';
import { useAuthStore } from '@/store/useAuthStore';
import { getPendingRisk } from '@/lib/risk-client';
import type { RiskAssessment } from '@/lib/risk';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

interface TrustFactor {
  face: string;
  typing: string;
  time: string;
}

interface TrustReport {
  score: number;
  level: string;
  factors: TrustFactor;
}

export default function VerifyMFAPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'needs-phone' | 'ready' | 'verifying' | 'analyzing' | 'success'>('loading');
  const [trustReport, setTrustReport] = useState<TrustReport | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'otp' | 'face'>('otp');
  const [capture, setCapture] = useState<FaceCaptureResult | null>(null);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearResendTimer = () => {
    if (resendTimer.current) {
      clearInterval(resendTimer.current);
      resendTimer.current = null;
    }
  };

  const startResendCountdown = (seconds: number) => {
    clearResendTimer();
    setResendIn(seconds);
    resendTimer.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          clearResendTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async (phone?: string) => {
    setStatus('loading');
    try {
      const user = JSON.parse(sessionStorage.getItem('pendingAuthUser') || '{}');
      const token = sessionStorage.getItem('pendingAuthToken');

      const res = await fetch('/api/auth/verify-mfa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: token, user, phone: phone || undefined }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      if (result.needsPhone) {
        setStatus('needs-phone');
        return;
      }

      setPhoneMasked(result.phoneMasked);
      setMockCode(result.code || null);
      setStatus('ready');
      startResendCountdown(Math.ceil((result.resendAfterMs || 30000) / 1000));

      if (result.provider === 'mock') {
        toast.info('Code logged to mock SMS inbox (demo mode)');
      } else {
        toast.success('Verification code sent via SMS');
      }
    } catch (err) {
      setStatus('needs-phone');
      toast.error((err as Error).message);
    }
  };

  useEffect(() => {
    const pendingUser = sessionStorage.getItem('pendingAuthUser');
    if (!pendingUser) {
      router.push('/login');
      return;
    }
    setRisk(getPendingRisk());
    sendOtp();
    return () => clearResendTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneInput.replace(/\D/g, '').length < 7) {
      toast.error('Please enter a valid phone number');
      return;
    }
    await sendOtp(phoneInput);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mfaMethod === 'otp' && otp.length < 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    if (mfaMethod === 'face' && (!capture || !capture.embeddings || capture.embeddings.length === 0)) {
      toast.error('Please complete face verification first');
      return;
    }

    setStatus('verifying');

    try {
      const user = JSON.parse(sessionStorage.getItem('pendingAuthUser') || '{}');
      const token = sessionStorage.getItem('pendingAuthToken');
      const signals = JSON.parse(sessionStorage.getItem('pendingSecuritySignals') || '{}');

      const bodyData: any = {
        mfaMethod,
        tempToken: token,
        user,
        securitySignals: signals,
        risk: sessionStorage.getItem('pendingRisk') ? JSON.parse(sessionStorage.getItem('pendingRisk')!) : null
      };

      if (mfaMethod === 'otp') {
        bodyData.otp = otp;
      } else if (mfaMethod === 'face' && capture) {
        bodyData.embedding = capture.embeddings[0];
        bodyData.securitySignals = { ...signals, liveness: capture.liveness };
      }

      // 1. Verify MFA
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'MFA Verification failed');
      }

      // 2. MFA Success, now analyzing Trust Score (visual delay for effect)
      setStatus('analyzing');
      setTrustReport(result.trustReport);

      setTimeout(() => {
        setStatus('success');

        // Save the final user session
        setUser(result.user);

        const role = String(result.user?.role || '').toUpperCase();
        const isAdmin = ADMIN_ROLES.has(role);
        const needsDetails = !isAdmin && result.user?.profile_completed !== true;
        const mustChangePassword = result.user?.must_change_password === true;

        // Keep pending auth state so the forced password change can finish
        // the ceremony; only clean up once the new password is stored.
        if (!mustChangePassword) {
          sessionStorage.removeItem('pendingAuthUser');
          sessionStorage.removeItem('pendingAuthToken');
          sessionStorage.removeItem('pendingSecuritySignals');
        }

        setTimeout(() => {
          if (mustChangePassword) {
            router.push('/change-password');
          } else if (isAdmin) {
            router.push('/mfa-setup/passkey');
          } else if (needsDetails) {
            router.push('/onboarding/details');
          } else if (role === 'MANAGER') {
            router.push('/manager/dashboard');
          } else {
            router.push('/dashboard');
          }
        }, 3000);
      }, 2000);

    } catch (err) {
      setStatus('ready');
      toast.error((err as Error).message);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
        <Card className="w-full max-w-md p-8 flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-4" />
          <p className="text-sm text-gray-400">Sending verification code to your phone...</p>
        </Card>
      </div>
    );
  }

  if (status === 'needs-phone') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
              <Phone className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Verify Phone Number</h1>
            <p className="text-gray-400 text-center text-sm">
              No phone number is registered for this account. Enter your mobile number to receive the one-time passcode.
            </p>
          </div>

          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <Input
              type="tel"
              placeholder="+1 555 000 1234"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
              className="text-center font-mono"
              autoFocus
            />
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold">
              Send Code
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (status === 'analyzing' || status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
        <Card className="w-full max-w-md p-8 flex flex-col items-center">
          {status === 'analyzing' ? (
            <>
              <div className="w-20 h-20 relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping" />
                <img src="/new-logo.png" alt="AI Engine" className="w-12 h-12 object-contain animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Analyzing Security Context...</h2>
              <ul className="text-sm text-gray-400 space-y-2 w-full max-w-xs mt-4">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> OTP verified</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Login pattern analyzed</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Security assessment complete</li>
              </ul>
            </>
          ) : (
            <>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                trustReport?.level === 'HIGH_TRUST' ? 'bg-emerald-500/20 text-emerald-400' :
                trustReport?.level === 'MEDIUM_TRUST' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {trustReport?.level === 'HIGH_TRUST' ? <ShieldCheck className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">Trust Score: {trustReport?.score}/100</h2>
              <p className={`text-sm font-semibold mb-6 ${
                trustReport?.level === 'HIGH_TRUST' ? 'text-emerald-400' :
                trustReport?.level === 'MEDIUM_TRUST' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {trustReport?.level.replace('_', ' ')}
              </p>

              <div className="bg-white/5 p-4 rounded-lg w-full text-sm text-gray-300 mb-6">
                <p className="mb-2 font-semibold">Security Assessment:</p>
                <ul className="space-y-1 text-xs">
                  <li>Face Match: {trustReport?.factors?.face === 'normal' ? '✓ Passed' : '⚠ Anomalous'}</li>
                  <li>Typing Pattern: {trustReport?.factors?.typing === 'normal' ? '✓ Normal' : '⚠ Anomalous'}</li>
                  <li>Time & Location: {trustReport?.factors?.time === 'normal' ? '✓ Normal' : '⚠ Unusual'}</li>
                </ul>
              </div>

              <p className="text-sm text-gray-400 animate-pulse">Redirecting to workspace...</p>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
            <KeyRound className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Two-Factor Authentication</h1>
          <p className="text-gray-400 text-center text-sm">
            {mfaMethod === 'otp' ? (
              <>Enter the 6-digit code sent via SMS to <span className="text-purple-300 font-semibold">{phoneMasked || 'your phone'}</span></>
            ) : (
              'Verify your identity using facial recognition'
            )}
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-lg mb-6 w-full max-w-[240px] mx-auto">
          <button
            type="button"
            onClick={() => setMfaMethod('otp')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mfaMethod === 'otp' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            SMS Code
          </button>
          <button
            type="button"
            onClick={() => setMfaMethod('face')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mfaMethod === 'face' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Face ID
          </button>
        </div>

        {risk && (
          <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-300">Risk score: {risk.score}/100 — MFA required</p>
              {risk.reasons.length > 0 && (
                <p className="text-[11px] text-amber-200/70">{risk.reasons.join(' · ')}</p>
              )}
            </div>
          </div>
        )}

        {mfaMethod === 'otp' && mockCode && (
          <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-xs text-amber-300 mb-1 flex items-center justify-center gap-1">
              <MessageSquareText className="w-3.5 h-3.5" /> Demo mode — SMS not delivered
            </p>
            <p className="text-2xl font-mono font-bold tracking-[0.3em] text-amber-200">{mockCode}</p>
            <p className="text-[11px] text-amber-400/70 mt-1">Also logged in .data/mock-sms-inbox.json</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {mfaMethod === 'otp' ? (
            <div>
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                maxLength={6}
                disabled={status === 'verifying'}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-4">
              <FaceCapturePanel
                mode="login"
                onComplete={(res) => {
                  setCapture(res);
                  // Optionally auto-submit when face is captured
                  // handleSubmit();
                }}
                disabled={status === 'verifying'}
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            disabled={status === 'verifying' || (mfaMethod === 'otp' ? otp.length !== 6 : !capture)}
          >
            {status === 'verifying' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </span>
            ) : (
              'Verify & Continue'
            )}
          </Button>
        </form>

        {mfaMethod === 'otp' && (
          <div className="mt-5 flex items-center justify-between text-xs">
            <button
              onClick={() => { clearResendTimer(); setStatus('needs-phone'); setPhoneInput(''); }}
              className="text-gray-400 hover:text-purple-300 transition-colors"
            >
              Change phone number
            </button>
            <button
              onClick={() => sendOtp()}
              disabled={resendIn > 0 || status === 'verifying'}
              className="text-purple-300 hover:text-purple-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendIn > 0 ? 'animate-spin' : ''}`} />
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
