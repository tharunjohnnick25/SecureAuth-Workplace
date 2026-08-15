'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, KeyRound, ScanFace } from 'lucide-react';
import { FaceCapturePanel, type FaceCaptureResult } from '@/components/face/FaceCapturePanel';
import { useAuthStore } from '@/store/useAuthStore';

export default function FaceLoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [capture, setCapture] = useState<FaceCaptureResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'email' | 'face'>('email');

  const handleFaceComplete = async (result: FaceCaptureResult) => {
    setCapture(result);
    if (!email) {
      toast.error('Please enter your work email first');
      setStep('email');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          embedding: result.embeddings[0],
          liveness: result.liveness,
          deviceFingerprint: typeof window !== 'undefined' ? window.localStorage.getItem('device_fingerprint') : null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message =
          data.error ||
          'Face login failed';
        toast.error(message);
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          // Retryable — keep the user on the face step.
          setStep('face');
          setCapture(null);
        }
        return;
      }

      toast.success(data.message || 'Face verified successfully!');
      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
      });
      router.push('/dashboard');
    } catch (err) {
      toast.error('An error occurred during face verification');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
              <ShieldCheck className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Face Login</CardTitle>
          <CardDescription className="text-slate-400">
            Anti-spoofing liveness check + FaceNet match (≥0.6 similarity)
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) {
                  toast.error('Please enter your work email');
                  return;
                }
                setStep('face');
                setCapture(null);
              }}
              className="space-y-4 max-w-sm mx-auto"
            >
              <div className="space-y-2">
                <Label htmlFor="face-email">Work Email</Label>
                <Input
                  id="face-email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-slate-700 focus:border-blue-500"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-6">
                Continue to Face Scan
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-sm mx-auto w-full">
                <span className="text-sm text-slate-400">Signed in as <span className="text-white font-medium">{email}</span></span>
                <Button variant="ghost" size="sm" onClick={() => setStep('email')} className="text-slate-400 hover:text-white">
                  Change
                </Button>
              </div>

              <FaceCapturePanel
                mode="login"
                onComplete={handleFaceComplete}
                disabled={isProcessing}
              />

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Matching face against encrypted enrollment…
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-center">
                <Link href="/login/passkey" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                  <KeyRound className="w-4 h-4" />
                  Can’t use face? Sign in with passkey
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
