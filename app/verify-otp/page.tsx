'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { clearBiometricRequirement } = useAuthStore();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error('Invalid verification code');

      clearBiometricRequirement();
      toast.success('Verification successful');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold mb-2">Verify OTP</h1>
          <p className="text-gray-400 text-center text-sm">
            Enter the 6-digit code sent to your device
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((val, i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={val}
                onChange={(e) => {
                  const newOtp = [...otp];
                  newOtp[i] = e.target.value.replace(/\D/g, '');
                  setOtp(newOtp);
                  if (e.target.value && i < 5) {
                    const next = document.getElementById(`otp-${i + 1}`);
                    next?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !val && i > 0) {
                    const prev = document.getElementById(`otp-${i - 1}`);
                    prev?.focus();
                  }
                }}
                id={`otp-${i}`}
                className="w-12 h-14 bg-black/40 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:border-cyan-500/50 outline-none transition-all"
              />
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold"
            size="lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
