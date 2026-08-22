'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, Loader2, ArrowRight, ShieldAlert, CheckCircle2, KeyRound, Eye, EyeOff, Camera, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import { getDeviceFingerprint } from '@/lib/security/fingerprint';
import { useLocation } from '@/hooks/useLocation';
import { useLanguage } from "@/context/LanguageContext";

type Step = 'login' | 'analyzing' | 'mfa' | 'camera' | 'success';

export function MultiStepLogin() {
    const { t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { setUser } = useAuthStore();
  const { location, requestLocation } = useLocation();
  const [fingerprint, setFingerprint] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    setFingerprint(getDeviceFingerprint());
    requestLocation();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      toast.error('Camera access denied. Please enable camera permissions.');
    }
  };

  const completeLogin = useCallback(async (user: any, session: any) => {
    try {
      setStep('success');

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const p = profile as any;
      setUser({
        id: user.id,
        email: user.email!,
        role: p?.role || 'employee',
        first_name: p?.full_name?.split(' ')[0] || '',
        last_name: p?.full_name?.split(' ').slice(1).join(' ') || ''
      });

      setTimeout(() => {
        router.push('/dashboard');
        toast.success('Authentication successful');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Error completing profile setup');
      setStep('login');
    }
  }, [router, setUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fingerprint,
          location,
          typingMetrics: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign-in failed. Please check your credentials and try again.');

      setStep('analyzing');

      setTimeout(() => {
        setIsLoading(false);
        if (data.requiresMFA) {
          setStep('mfa');
        } else if (data.requiresBiometric) {
          setStep('camera');
          startCamera();
        } else {
          completeLogin(data.user, data.session);
        }
      }, 2000);

    } catch (error: any) {
      setIsLoading(false);
      toast.error(error.message || 'Invalid login credentials');
    }
  };

  const handleMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      toast.error('Please enter the full 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, factorId: 'totp' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      completeLogin({}, {});
    } catch (error: any) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleCameraVerify = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      completeLogin({}, {});
    }, 2000);
  };

  const stepVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617] overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      <div className="w-full max-w-lg z-10">
        <AnimatePresence mode="wait">

          {step === 'login' && (
            <motion.div key="login" {...stepVariants} className="glass-panel p-10 border-blue-500/20 shadow-2xl">
               <div className="flex flex-col items-center text-center mb-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <Shield className="text-white w-10 h-10" />
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase tracking-[0.2em]">{'Secure'}<span className="text-blue-400">{'Auth'}</span></h1>
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">{'Enterprise acces'}</div>
               </div>

               <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">{'Identity identif'}</label>
                       <Input
                         type="email"
                         placeholder="employee@company.com"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         icon={<Mail className="w-5 h-5 text-blue-400" />}
                         className="h-14 bg-black/40 border-white/10 text-white"
                         required
                       />
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{'Access key'}</label>
                          <button type="button" onClick={() => router.push('/forgot-password')} className="text-[10px] font-bold text-blue-400 hover:text-blue-300">{'Recover key'}</button>
                       </div>
                       <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<Lock className="w-5 h-5 text-blue-400" />}
                            className="h-14 bg-black/40 border-white/10 text-white pr-12"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                       </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20">
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Initialize Session'}
                  </Button>
               </form>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div key="analyzing" {...stepVariants} className="glass-panel p-12 flex flex-col items-center text-center border-blue-400/30">
               <div className="relative mb-8">
                  <Loader2 className="w-20 h-20 text-blue-400 animate-spin" />
                  <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-400/50" />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">{'Threat analysis'}</h2>
               <p className="text-sm text-gray-400 mb-8 max-w-xs">{'Aiisauditingyou'}</p>

               <div className="space-y-3 w-full max-w-xs">
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} className="h-full bg-blue-500" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                     <span>{'Fingerprint audi'}</span>
                     <span className="text-blue-400">{'Active'}</span>
                  </div>
               </div>
            </motion.div>
          )}

          {step === 'camera' && (
            <motion.div key="camera" {...stepVariants} className="glass-panel p-10 border-purple-500/20 max-w-md w-full">
               <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
                    <Camera className="text-purple-400 w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{'Biometric verifi'}</h2>
                  <p className="text-sm text-gray-400 mt-2">{'Suspiciousactiv'}</p>
               </div>

               <div className="relative aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden mb-8">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale opacity-70" />
                  <div className="absolute inset-0 border-2 border-dashed border-purple-500/30 rounded-2xl m-8 pointer-events-none animate-pulse"></div>
                  {!stream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                       <Button onClick={startCamera} variant="outline" className="borderColor-purple-500/50 text-purple-400">
                          {'Enable camera'}</Button>
                    </div>
                  )}
               </div>

               <Button onClick={handleCameraVerify} disabled={isLoading || !stream} className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20">
                 {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Confirm Identity'}
               </Button>

               <button onClick={() => setStep('login')} className="w-full mt-4 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest">{'Cancel audit'}</button>
            </motion.div>
          )}

          {step === 'mfa' && (
             <motion.div key="mfa" {...stepVariants} className="glass-panel p-10 border-yellow-500/20">
                <div className="flex flex-col items-center text-center mb-10">
                   <div className="w-16 h-16 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4 border border-yellow-500/20">
                     <ShieldAlert className="text-yellow-500 w-8 h-8" />
                   </div>
                   <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{'Multi factor node'}</h2>
                   <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">{t('Inputthe6digits_390')}</p>
                </div>

                <form onSubmit={handleMFA} className="space-y-8">
                   <div className="flex justify-between gap-2">
                     {otp.map((val, i) => (
                       <input
                         key={i}
                         type="text"
                         maxLength={1}
                         value={val}
                         onChange={(e) => {
                           const newOtp = [...otp];
                           newOtp[i] = e.target.value;
                           setOtp(newOtp);
                           if (e.target.value && i < 5) {
                             (e.target.nextSibling as HTMLInputElement)?.focus();
                           }
                         }}
                         className="w-12 h-14 bg-black/40 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:border-yellow-500/50 outline-none"
                       />
                     ))}
                   </div>

                   <Button type="submit" disabled={isLoading} className="w-full h-14 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-yellow-500/20">
                     {'Authorize access'}</Button>
                </form>
             </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" {...stepVariants} className="glass-panel p-12 flex flex-col items-center text-center border-green-500/30">
               <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20">
                 <CheckCircle2 className="text-green-400 w-10 h-10" />
               </div>
               <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-[0.2em]">{'Access granted'}</h2>
               <p className="text-xs text-gray-400 uppercase tracking-widest">{'Bridgingsecurec'}</p>

               <div className="mt-8 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1, repeat: Infinity, repeatDelay: 1 }}
                      className="w-1 h-1 bg-green-500 rounded-full"
                    />
                  ))}
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
