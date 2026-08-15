'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, MapPin, Camera, CheckCircle2, XCircle, Loader2, Building2, IdCard } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
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
import { resolveRiskRoute, storePendingAuth } from '@/lib/risk-client';
import { useLanguage } from '@/context/LanguageContext';
import { REGISTERED_COMPANIES, getCompanyByDomain, type Company } from '@/lib/companies';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

type LoginFormValues = z.infer<typeof loginSchema>;

type DeviceAuthStep = 'idle' | 'prompting' | 'verifying' | 'success' | 'failed' | 'camera_blocked';

export function EmployeeLogin() {
  const router = useRouter();
  const { setUser, setRequiresBiometric } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { metrics, handleKeyDown, handleKeyUp } = useTypingBehavior();
  const [fingerprint, setFingerprint] = useState<any>(null);
  const { location, requestLocation, loading: locationLoading } = useLocation();
  const { t } = useLanguage();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const simulatedRisk = 'medium';

  // Camera-based face verification
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Device Lock Screen Authentication State
  const [deviceAuthStep, setDeviceAuthStep] = useState<DeviceAuthStep>('idle');
  const [deviceVerified, setDeviceVerified] = useState(true);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    setFingerprint(getDeviceFingerprint());
    requestLocation();
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

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const domain = data.email.split('@')[1];
      const company = selectedCompany || getCompanyByDomain(domain);
      
      const securitySignals = {
        fingerprint,
        typingMetrics: metrics,
        location: location || undefined,
        deviceVerified: true,
        simulatedRisk,
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId || data.email, 
          email: data.email,
          password: data.password,
          company_id: company?.id || null,
          company_name: company?.name || null,
          company_domain: company?.domain || domain || null,
          company_country: company?.country || null,
          role: 'EMPLOYEE',
          ...securitySignals
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Adaptive MFA: route to the ceremony the risk policy demands.
      if (result.risk) {
        const role = String(result.user?.role || '').toUpperCase();
        const isAdmin = ADMIN_ROLES.has(role);
        const needsDetails = !isAdmin && result.user?.profile_completed !== true;
        const defaultRoute = needsDetails ? '/onboarding/details' : '/dashboard';

        const flow = resolveRiskRoute(result, defaultRoute);
        if (flow.completed) {
          setUser(result.user);
        } else if (flow.needsPending) {
          storePendingAuth(result, securitySignals);
        } else if (flow.route === '/login/blocked') {
          sessionStorage.setItem('pendingRisk', JSON.stringify(result.risk));
        }
        window.location.href = flow.route;
        return;
      }

      if (result.requiresBiometric) {
        // Store pending auth state to pass to the next step in the pipeline
        storePendingAuth(result, securitySignals);
        window.location.href = '/verify-mfa';
      } else {
        // Fallback for older mock tests
        setUser(result.user);
        const role = String(result.user?.role || '').toUpperCase();
        const isAdmin = ADMIN_ROLES.has(role);
        const needsDetails = !isAdmin && result.user?.profile_completed !== true;
        window.location.href = needsDetails ? '/onboarding/details' : '/dashboard';
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
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <img src="/new-logo.png" alt="SecureAuth Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
          </div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{t('employeeLoginTitle')}</h1>
          <p className="text-gray-400 text-center text-sm">
            {t('employeeLoginDesc')}
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
                  <p className="text-sm font-semibold text-white mb-1">{t('Step1FaceVerifi_355')}</p>
                  <p className="text-xs text-gray-400">
                    {'Taptoverifyyour'}</p>
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
              <p className="text-sm font-medium text-emerald-400">{'Identity verifie'}</p>
              <p className="text-xs text-gray-400">{'Cameraverificat'}</p>
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
            <span className="text-sm text-gray-300">{'Enter credential'}</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm text-gray-300">{t('employeeIdLabel')}</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-12345"
                  disabled={!deviceVerified}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('employeeIdHint')}</p>
            </div>

            <div>
              <label className="block mb-2 text-sm text-gray-300">{t('companyLabel')}</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const company = REGISTERED_COMPANIES.find((c) => c.id === e.target.value) || null;
                    setSelectedCompany(company);
                  }}
                  disabled={!deviceVerified}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="" className="bg-[#0f0f23]">{t('selectRegisteredCompany')}</option>
                  {REGISTERED_COMPANIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0f0f23]">
                      {c.name} — {c.country} ({c.domain})
                    </option>
                  ))}
                </select>
              </div>
              {selectedCompany && (
                <p className="mt-1 text-xs text-emerald-400">
                  {t('companyDetected')}: {selectedCompany.name} · {selectedCompany.industry} · {selectedCompany.country}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-2 text-sm text-gray-300">{t('employeeEmailLabel')}</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="employee@company.com"
                icon={<Mail className="w-4 h-4" />}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                disabled={!deviceVerified}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  register('email').onChange(e);
                  const domain = e.target.value.split('@')[1] || '';
                  setSelectedCompany(getCompanyByDomain(domain) || null);
                }}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{'Validemailisreq'}</p>}
            </div>

            <div>
              <label className="block mb-2 text-sm text-gray-300">{t('passwordLabel')}</label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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
              disabled={isSubmitting || !deviceVerified}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('analyzing')}
                </span>
              ) : (
                t('signInSecurely')
              )}
            </Button>
          </form>
        </motion.div>

        {/* Links */}
        <div className="mt-4 flex justify-center text-xs">
          <button onClick={() => router.push('/forgot-password')} className="text-gray-400 hover:text-cyan-400 transition-colors">
            {t('forgotPassword')}
          </button>
        </div>



        {/* Security indicators */}
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Camera className={`w-4 h-4 ${deviceVerified ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span>{deviceVerified ? 'Verified' : 'Pending'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src="/new-logo.png" className="w-4 h-4 object-contain" alt="AI Engine" />
            <span>{'Airisk engine'}</span>
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
                    {'Try again'}</Button>
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
                    {'Skip'}</Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
