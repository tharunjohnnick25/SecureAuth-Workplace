'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function PasskeyLoginPage() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { setUser } = useAuthStore();

  const handlePasskeyLogin = async () => {
    setIsAuthenticating(true);
    try {
      // 1. Get options from server (Discoverable Credentials don't need email)
      const optionsRes = await fetch('/api/auth/webauthn/login/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!optionsRes.ok) throw new Error('Failed to generate login options');
      const options = await optionsRes.json();

      // 2. Prompt browser biometrics
      let authRes;
      try {
        authRes = await startAuthentication({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          toast.error('Login cancelled.');
          return;
        }
        throw err;
      }

      // 3. Verify on server
      const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authRes),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.verified) {
        toast.success('Successfully logged in with Passkey!');
        setUser(verifyData.user);
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        toast.error(verifyData.error || 'Authentication failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during passkey login');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Fingerprint className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Passkey Login</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            Sign in using your device's biometric sensor (Touch ID, Face ID) or a hardware security key.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 mt-4">
          <Button 
            onClick={handlePasskeyLogin}
            disabled={isAuthenticating}
            className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            {isAuthenticating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying Identity...</>
            ) : (
              'Sign in with Passkey'
            )}
          </Button>

          <Button 
            variant="link" 
            onClick={() => router.push('/login')} 
            className="text-slate-400 hover:text-slate-200 mt-4"
          >
            Back to Password Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
