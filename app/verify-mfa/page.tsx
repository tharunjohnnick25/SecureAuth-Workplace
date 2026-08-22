'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Smartphone, Loader2, ShieldCheck, Fingerprint, ScanFace } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { startAuthentication } from '@simplewebauthn/browser';
import { FaceScanner } from '@/components/FaceScanner';

export default function VerifyMFAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  const { setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [method, setMethod] = useState<'choose' | 'totp' | 'passkey' | 'face'>('choose');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'ready' | 'verifying' | 'success'>('ready');

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
        
        const passkey = data.user.passkey_enabled;
        const totp = data.user.is_mfa_enabled || data.user.totp_enabled;
        const face = !!data.user.face_embedding;
        
        if (!passkey && !totp && !face) {
           window.location.href = '/mfa-setup';
           return;
        }
        
        // Auto-select preferred method based on what's available
        if (passkey) {
           setMethod('passkey');
           // Automatically prompt for passkey if it's the primary method
           setTimeout(() => handlePasskeyLogin(data.user.email), 500);
        } else if (face) {
           setMethod('face');
        } else if (totp) {
           setMethod('totp');
        }
      }
    } catch (err) {
      console.error('Session fetch error', err);
    }
  };

  const handlePasskeyLogin = async (email?: string) => {
    setStatus('verifying');
    try {
      // 1. Get options from server
      const optionsRes = await fetch('/api/auth/passkey/login/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email || profile?.email })
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(options.error || 'Failed to get passkey options');

      // 2. Prompt user with native WebAuthn UI
      let asseResp;
      try {
        asseResp = await startAuthentication(options);
      } catch (err: any) {
        throw new Error('Passkey authentication was cancelled or failed.');
      }

      // 3. Send response to server for verification
      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response: asseResp, email: email || profile?.email })
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Passkey verification failed');

      toast.success('Verified successfully via Passkey!');
      finalizeSuccess(verifyData.user);
    } catch (err: any) {
      setStatus('ready');
      toast.error(err.message);
    }
  };

  const handleTotpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (otp.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }
    
    setStatus('verifying');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Verification failed');
      
      toast.success('Authenticator code verified successfully!');
      finalizeSuccess(result.user);
    } catch (err: any) {
      setStatus('ready');
      toast.error(err.message);
    }
  };

  const handleFaceLogin = async (base64Image: string) => {
    setStatus('verifying');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaMethod: 'face', photo: base64Image }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Face verification failed');
      
      toast.success('Face verified successfully!');
      finalizeSuccess(result.user);
    } catch (err: any) {
      setStatus('ready');
      toast.error(err.message);
    }
  };

  const finalizeSuccess = (userData: any) => {
    setStatus('success');
    if (userData) {
      setUser(userData);
    }
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const hasPasskey = profile.passkey_enabled;
  const hasTotp = profile.is_mfa_enabled || profile.totp_enabled;
  const hasFace = !!profile.face_embedding;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background styling omitted for brevity, keeping it sleek */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a1a2e,transparent_50%)] opacity-50" />
      
      <Card className="w-full max-w-md bg-white/5 border-white/10 p-8 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Two-Step Verification</h1>
          <p className="text-gray-400 text-sm">
            Please verify your identity to continue to the workspace.
          </p>
        </div>

        {method === 'choose' && (
          <div className="space-y-4">
            {hasPasskey && (
              <button
                onClick={() => handlePasskeyLogin()}
                className="w-full flex items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                  <Fingerprint className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Use Passkey</h3>
                  <p className="text-sm text-gray-400">Windows Hello, TouchID, or Security Key</p>
                </div>
              </button>
            )}

            {hasTotp && (
              <button
                onClick={() => setMethod('totp')}
                className="w-full flex items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mr-4">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Authenticator App</h3>
                  <p className="text-sm text-gray-400">Google Auth, Authy, etc.</p>
                </div>
              </button>
            )}

            {hasFace && (
              <button
                onClick={() => setMethod('face')}
                className="w-full flex items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                  <ScanFace className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Face Verification</h3>
                  <p className="text-sm text-gray-400">Scan your face to verify</p>
                </div>
              </button>
            )}
          </div>
        )}

        {method === 'passkey' && (
           <div className="text-center space-y-6">
             <div className="py-8">
                <Fingerprint className="w-16 h-16 text-blue-400 mx-auto animate-pulse" />
                <p className="text-white font-medium mt-6">Waiting for device verification...</p>
                <p className="text-gray-400 text-sm mt-2">Please follow the prompt on your screen.</p>
             </div>
             <Button
                variant="default"
                className="w-full"
                onClick={() => handlePasskeyLogin()}
                disabled={status === 'verifying'}
             >
                {status === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Retry Passkey'}
             </Button>
             
             {hasTotp && (
                 <button onClick={() => setMethod('totp')} className="text-sm text-blue-400 hover:text-blue-300">
                    Use Authenticator App instead
                 </button>
             )}
           </div>
        )}

        {method === 'totp' && (
          <form onSubmit={handleTotpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Enter 6-digit code
              </label>
              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-white/5"
                disabled={status === 'verifying' || status === 'success'}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>
            
            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={otp.length !== 6 || status === 'verifying' || status === 'success'}
            >
              {status === 'verifying' ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
            </Button>

            <div className="text-center space-y-4">
              {hasPasskey && (
                  <button type="button" onClick={() => setMethod('passkey')} className="text-sm text-blue-400 hover:text-blue-300 block w-full">
                      Use Passkey instead
                  </button>
              )}
              {hasFace && (
                  <button type="button" onClick={() => setMethod('face')} className="text-sm text-purple-400 hover:text-purple-300 block w-full">
                      Use Face Verification instead
                  </button>
              )}
            </div>
          </form>
        )}

        {method === 'face' && (
          <div className="space-y-6 w-full">
             <FaceScanner 
               onCapture={handleFaceLogin} 
               isProcessing={status === 'verifying'} 
             />
             <div className="text-center space-y-4">
               {hasPasskey && (
                   <button type="button" onClick={() => setMethod('passkey')} className="text-sm text-purple-400 hover:text-purple-300 block w-full">
                       Use Passkey instead
                   </button>
               )}
               {hasTotp && (
                   <button type="button" onClick={() => setMethod('totp')} className="text-sm text-emerald-400 hover:text-emerald-300 block w-full">
                       Use Authenticator App instead
                   </button>
               )}
             </div>
          </div>
        )}

      </Card>
    </div>
  );
}
