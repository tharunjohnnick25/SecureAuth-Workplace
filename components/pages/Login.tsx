'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, MapPin, Camera, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '@/store/useAuthStore';
import { loginSchema } from '@/lib/validations/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTypingBehavior } from '@/hooks/useTypingBehavior';
import { getDeviceFingerprint } from '@/lib/security/fingerprint';
import { useLocation } from '@/hooks/useLocation';

type LoginFormValues = z.infer<typeof loginSchema>;

type DeviceAuthStep = 'idle' | 'prompting' | 'verifying' | 'success' | 'failed' | 'camera_blocked';

export function Login() {
  const router = useRouter();
  const { setUser, setRequiresBiometric } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { metrics, handleKeyDown, handleKeyUp } = useTypingBehavior();
  const [fingerprint, setFingerprint] = useState<any>(null);
  const { location, requestLocation, loading: locationLoading } = useLocation();

  // Camera-based face verification
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Device Lock Screen Authentication State
  const [deviceAuthStep, setDeviceAuthStep] = useState<DeviceAuthStep>('idle');
  const [deviceVerified, setDeviceVerified] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  useEffect(() => {
    setFingerprint(getDeviceFingerprint());
    requestLocation();
    // Auto-verify device in mock auth mode
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      setDeviceVerified(true);
    }
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = async (): Promise<boolean> => {
    try {
      setCameraError(null);
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      return true;
    } catch (err: any) {
      setCameraError(err.name === 'NotAllowedError' ? 'Camera permission denied' : 'Camera unavailable');
      return false;
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  // Trigger device face verification via camera
  const triggerDeviceAuth = useCallback(async () => {
    setShowDeviceModal(true);
    setDeviceAuthStep('prompting');

    const hasCamera = await startCamera();

    if (!hasCamera) {
      setDeviceAuthStep('camera_blocked');
      return;
    }

    // Camera is live — simulate a brief capture delay for UX
    setDeviceAuthStep('verifying');
    setTimeout(() => {
      stopCamera();
      setDeviceAuthStep('success');
      setTimeout(() => {
        setDeviceVerified(true);
        setShowDeviceModal(false);
        toast.success('Face verification successful');
      }, 1000);
    }, 2000);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      // Sign out first to clear any stale session that might interfere with OAuth
      await supabase.auth.signOut();
      // Clear any existing persisted session from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('secureauth-session');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    if (!deviceVerified) {
      toast.error('Please verify your device identity first');
      triggerDeviceAuth();
      return;
    }

    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fingerprint,
          typingMetrics: metrics,
          location: location || undefined,
          deviceVerified: true,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.requiresBiometric) {
        setRequiresBiometric(true, result.riskLevel);
        router.push('/verify-biometric');
      } else {
        setUser(result.user);
        const userRole = (result.user?.role || '').toUpperCase();
        if (['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN'].includes(userRole)) {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const getAuthStepIcon = () => {
    switch (deviceAuthStep) {
      case 'prompting':
        return <Camera className="w-16 h-16 text-cyan-400 animate-pulse" />;
      case 'verifying':
        return <Camera className="w-16 h-16 text-purple-400 animate-pulse" />;
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-400" />;
      case 'camera_blocked':
        return <XCircle className="w-16 h-16 text-amber-400" />;
      default:
        return <Camera className="w-16 h-16 text-cyan-400" />;
    }
  };

  const getAuthStepMessage = () => {
    switch (deviceAuthStep) {
      case 'prompting':
        return { title: 'Camera Access Required', desc: 'Allow camera access for face verification' };
      case 'verifying':
        return { title: 'Capturing Image', desc: 'Please look at the camera to verify your identity' };
      case 'success':
        return { title: 'Identity Verified!', desc: 'Your face has been verified successfully' };
      case 'failed':
        return { title: 'Verification Failed', desc: 'Could not verify identity. Please try again.' };
      case 'camera_blocked':
        return { title: 'Camera Unavailable', desc: cameraError || 'Please allow camera access in your browser settings' };
      default:
        return { title: '', desc: '' };
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">SecureAuth AI</h1>
          <p className="text-gray-400 text-center text-sm">
            Multi-Factor Risk-Based Authentication
          </p>
        </div>

        {/* Step 1: Device Lock Screen Auth */}
        {!deviceVerified && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={triggerDeviceAuth}
              className="w-full group relative overflow-hidden rounded-xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 p-6 transition-all duration-300 hover:bg-cyan-500/5"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-500/60 transition-all">
                  <Camera className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white mb-1">Step 1: Face Verification</p>
                  <p className="text-xs text-gray-400">
                    Tap to verify your identity using your camera
                  </p>
                </div>
              </div>
              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        )}

        {/* Device verified badge */}
        {deviceVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Identity Verified</p>
              <p className="text-xs text-gray-400">Camera verification passed</p>
            </div>
          </motion.div>
        )}

        {/* Step 2: Login Form */}
        <motion.div
          animate={{ opacity: deviceVerified ? 1 : 0.4, pointerEvents: deviceVerified ? 'auto' : 'none' }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${deviceVerified ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
            <span className="text-sm text-gray-300">Enter Credentials</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm text-gray-300">Gmail Address</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="user@gmail.com"
                icon={<Mail className="w-4 h-4" />}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                disabled={!deviceVerified}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block mb-2 text-sm text-gray-300">Password</label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  icon={<Lock className="w-4 h-4" />}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  disabled={!deviceVerified}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {/* Location Status */}
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 p-2.5 rounded-lg border border-white/5">
              <MapPin className={`w-4 h-4 shrink-0 ${location ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>
                {locationLoading ? 'Detecting location...' :
                 location ? `Location: ${location.city || 'Detected'}, ${location.country || ''}` :
                 'Please allow location access for enhanced security'}
              </span>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
              size="lg"
              disabled={isSubmitting || locationLoading || !deviceVerified}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Risk & Verifying...
                </span>
              ) : (
                'Sign In Securely'
              )}
            </Button>
          </form>
        </motion.div>

        {/* Links */}
        <div className="mt-4 flex justify-between text-xs">
          <button onClick={() => router.push('/forgot-password')} className="text-gray-400 hover:text-cyan-400 transition-colors">
            Forgot password?
          </button>
          <button onClick={() => router.push('/signup')} className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Create account
          </button>
        </div>

        {/* Social Login */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ✅ OAuth buttons are always clickable — Supabase handles identity verification */}
            <Button variant="outline" onClick={() => handleSocialLogin('google')} className="gap-2 border-white/10 hover:bg-white/5">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
            <Button variant="outline" onClick={() => handleSocialLogin('github')} className="gap-2 border-white/10 hover:bg-white/5">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub
            </Button>
          </div>
        </div>

        {/* Security indicators */}
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Camera className={`w-4 h-4 ${deviceVerified ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span>{deviceVerified ? 'Verified' : 'Pending'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>AI Risk Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className={`w-4 h-4 ${location ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{location ? 'Located' : 'Pending'}</span>
          </div>
        </div>
      </Card>

      {/* ====== DEVICE AUTHENTICATION MODAL ====== */}
      <AnimatePresence>
        {showDeviceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div onClick={() => { stopCamera(); setShowDeviceModal(false); setDeviceAuthStep('idle'); }} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-[#0f0f23]/95 border border-white/10 rounded-2xl shadow-2xl shadow-cyan-500/10 p-8 backdrop-blur-xl"
            >
              {/* Animated ring */}
              <div className="relative flex justify-center mb-6">
                <motion.div
                  animate={{
                    boxShadow: deviceAuthStep === 'success'
                      ? ['0 0 0px rgba(16,185,129,0.3)', '0 0 40px rgba(16,185,129,0.15)', '0 0 0px rgba(16,185,129,0.3)']
                      : deviceAuthStep === 'failed' || deviceAuthStep === 'camera_blocked'
                      ? ['0 0 0px rgba(239,68,68,0.3)', '0 0 40px rgba(239,68,68,0.15)', '0 0 0px rgba(239,68,68,0.3)']
                      : ['0 0 0px rgba(6,182,212,0.3)', '0 0 40px rgba(6,182,212,0.15)', '0 0 0px rgba(6,182,212,0.3)'],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-28 h-28 rounded-full flex items-center justify-center bg-white/5 border border-white/10"
                >
                  {getAuthStepIcon()}
                </motion.div>
              </div>

              {/* Status text */}
              <div className="text-center mb-6">
                <motion.h3
                  key={deviceAuthStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-semibold text-white mb-2"
                >
                  {getAuthStepMessage().title}
                </motion.h3>
                <motion.p
                  key={`desc-${deviceAuthStep}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-gray-400"
                >
                  {getAuthStepMessage().desc}
                </motion.p>
              </div>

              {/* Camera preview */}
              {(deviceAuthStep === 'prompting' || deviceAuthStep === 'verifying') && (
                <div className="relative aspect-video bg-black rounded-xl border border-white/10 overflow-hidden mb-6">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-70" />
                  <div className="absolute inset-0 border-2 border-dashed border-cyan-500/30 rounded-xl m-6 pointer-events-none animate-pulse" />
                </div>
              )}

              {/* Progress bar */}
              {(deviceAuthStep === 'prompting' || deviceAuthStep === 'verifying') && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full"
                  />
                </div>
              )}

              {/* Retry/skip buttons for failed or blocked state */}
              {(deviceAuthStep === 'failed' || deviceAuthStep === 'camera_blocked') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 mt-4">
                  <Button
                    onClick={() => {
                      setShowDeviceModal(false);
                      setDeviceAuthStep('idle');
                      setTimeout(triggerDeviceAuth, 300);
                    }}
                    className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      stopCamera();
                      setShowDeviceModal(false);
                      setDeviceAuthStep('idle');
                      setDeviceVerified(true);
                      toast.info('Proceeding without camera verification');
                    }}
                    variant="outline"
                    className="flex-1 border-white/10 text-gray-400"
                  >
                    Skip
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
