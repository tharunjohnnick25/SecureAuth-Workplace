'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, MapPin, Camera, CheckCircle2, XCircle, Loader2, Building2, ChevronRight, User, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';

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
type LoginFlowStep = 1 | 2 | 3; // 1: Email, 2: Face, 3: Password

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

  // Flow State
  const [currentStep, setCurrentStep] = useState<LoginFlowStep>(1);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [requiresFace, setRequiresFace] = useState(false);

  // Camera-based face verification
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Device Lock Screen Authentication State
  const [deviceAuthStep, setDeviceAuthStep] = useState<DeviceAuthStep>('idle');
  const [deviceVerified, setDeviceVerified] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      } catch (err) {
        console.error('Failed to load face models', err);
      }
    };
    loadModels();

    setFingerprint(getDeviceFingerprint());
    requestLocation();
    
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      // In mock mode, we still demonstrate the UI flow, but we can bypass strict checks if needed
    }

    // Listen for messages from React Native Native App
    const handleNativeMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'native_face_success') {
          setDeviceVerified(true);
          setShowDeviceModal(false);
          setCurrentStep(3);
          toast.success('Face verified securely via Native Camera');
        } else if (data.type === 'native_face_failed') {
          toast.error(data.error || 'Native face verification failed');
          setDeviceAuthStep('failed');
          setCameraError(data.error || 'Face mismatch. Please try again.');
        }
      } catch (e) {}
    };
    
    // Also support document event for iOS injected JS communication
    const handleDocumentMessage = (event: any) => {
       if (event.detail && event.detail.type) {
         handleNativeMessage({ data: JSON.stringify(event.detail) } as any);
       }
    };

    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('nativeMessage', handleDocumentMessage);
    
    return () => {
      window.removeEventListener('message', handleNativeMessage);
      document.removeEventListener('nativeMessage', handleDocumentMessage);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch('email');

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
    if (animationRef.current) {
      clearInterval(animationRef.current as any);
      animationRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const handleVideoPlay = () => {
    if (animationRef.current) clearInterval(animationRef.current as any);
    
    animationRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && faceapi.nets.ssdMobilenetv1.isLoaded) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current, 
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
          );
          
          if (!videoRef.current || !canvasRef.current) return;
          
          const displaySize = { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Set color to cyan to match theme
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        } catch (err) {
          // Ignore intermittent tensor errors
        }
      }
    }, 100) as any;
  };

  const handleNextStep1 = async () => {
    if (!emailValue || errors.email) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setCheckingEmail(true);
    try {
      const res = await fetch('/api/auth/check-face-enrolled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue })
      });
      const data = await res.json();
      
      if (data.enrolled) {
        setRequiresFace(true);
        setCurrentStep(2);
      } else {
        // Skip face verification if not enrolled
        setRequiresFace(false);
        setDeviceVerified(true);
        setCurrentStep(3);
      }
    } catch (err) {
      // On error, safely fallback to password
      setDeviceVerified(true);
      setCurrentStep(3);
    } finally {
      setCheckingEmail(false);
    }
  };

  const triggerDeviceAuth = useCallback(async () => {
    // If running inside React Native, trigger the native camera instead
    if (typeof window !== 'undefined' && (window as any).isNativeApp) {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'start_face_login',
          email: emailValue
        }));
      }
      return;
    }

    setShowDeviceModal(true);
    setDeviceAuthStep('prompting');

    const hasCamera = await startCamera();
    if (!hasCamera) {
      setDeviceAuthStep('camera_blocked');
      return;
    }
  }, [emailValue]);

  const captureAndVerify = async () => {
    setDeviceAuthStep('verifying');
    try {
      if (!videoRef.current) throw new Error('Video not initialized');
      const video = videoRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Camera feed is blank. Please check permissions.');
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = dataUrl.split(',')[1];
      
      if (!base64Image || base64Image.length < 100) {
         throw new Error('Failed to capture a valid image from the camera.');
      }

      const res = await fetch('/api/auth/verify-face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, captured_image_base64: base64Image })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Identity verification failed');
      }

      stopCamera();
      setDeviceAuthStep('success');
      setTimeout(() => {
        setDeviceVerified(true);
        setShowDeviceModal(false);
        setCurrentStep(3);
        toast.success('Face verified successfully');
      }, 1000);

    } catch (err: any) {
      stopCamera();
      setDeviceAuthStep('failed');
      setCameraError(err.message);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const domain = data.email.split('@')[1];
      const company = selectedCompany || getCompanyByDomain(domain);
      
      const securitySignals = {
        fingerprint,
        typingMetrics: metrics,
        location: location || undefined,
        deviceVerified: deviceVerified,
        simulatedRisk,
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: data.email, 
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
        throw new Error(result.error || 'Sign-in failed. Please check your credentials and try again.');
      }

      if (result.requiresMfaSetup) {
        storePendingAuth(result, securitySignals);
        window.location.href = '/mfa-setup';
        return;
      }
      
      if (result.requiresBiometric || result.requiresMfa) {
        storePendingAuth(result, securitySignals);
        window.location.href = '/verify-mfa';
        return;
      }

      if (result.risk) {
        const role = String(result.user?.role || '').toUpperCase();
        const isAdmin = ADMIN_ROLES.has(role);
        const needsDetails = !isAdmin && result.user?.status === 'INVITED';
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

      setUser(result.user);
      const role = String(result.user?.role || '').toUpperCase();
      const isAdmin = ADMIN_ROLES.has(role);
      const needsDetails = !isAdmin && result.user?.status === 'INVITED';
      window.location.href = needsDetails ? '/onboarding/details' : '/dashboard';
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
        return <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-emerald-400" />;
      case 'failed':
      case 'camera_blocked':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <Camera className="w-16 h-16 text-cyan-400" />;
    }
  };

  const getAuthStepMessage = () => {
    switch (deviceAuthStep) {
      case 'prompting':
        return { title: 'Camera Required', desc: 'Allow camera access for face verification' };
      case 'verifying':
        return { title: 'Analyzing Identity', desc: 'Comparing with your enrolled template...' };
      case 'success':
        return { title: 'Identity Verified!', desc: 'Match confirmed securely.' };
      case 'failed':
        return { title: 'Verification Failed', desc: cameraError || 'Face mismatch. Please try again.' };
      case 'camera_blocked':
        return { title: 'Camera Error', desc: cameraError || 'Please allow camera access' };
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

      <Card className="w-full max-w-md relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 mb-3 flex items-center justify-center">
            <img src="/new-logo.png" alt="SecureAuth Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
          </div>
          <h1 className="text-2xl font-semibold mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{t('employeeLoginTitle')}</h1>
          <p className="text-gray-400 text-center text-xs">
            {t('employeeLoginDesc')}
          </p>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-1 rounded-full ${currentStep >= 1 ? 'bg-cyan-500' : 'bg-white/10'}`} />
          <div className={`w-8 h-1 rounded-full ${currentStep >= 2 ? 'bg-cyan-500' : 'bg-white/10'}`} />
          <div className={`w-8 h-1 rounded-full ${currentStep >= 3 ? 'bg-cyan-500' : 'bg-white/10'}`} />
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Form Container */}
        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: EMAIL */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-white">Identify Yourself</h3>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm text-gray-300">{t('companyLabel')}</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={selectedCompany?.id || ''}
                        onChange={(e) => setSelectedCompany(REGISTERED_COMPANIES.find((c) => c.id === e.target.value) || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#0f0f23]">{t('selectRegisteredCompany')}</option>
                        {REGISTERED_COMPANIES.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[#0f0f23]">
                            {c.name} ({c.domain})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm text-gray-300">{t('employeeEmailLabel')}</label>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="employee@company.com"
                      icon={<Mail className="w-4 h-4" />}
                      onChange={(e) => {
                        register('email').onChange(e);
                        const domain = e.target.value.split('@')[1] || '';
                        setSelectedCompany(getCompanyByDomain(domain) || null);
                      }}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-400">Valid email is required.</p>}
                  </div>

                  <Button
                    onClick={handleNextStep1}
                    disabled={checkingEmail || !emailValue}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white mt-4"
                  >
                    {checkingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <span className="flex items-center gap-2">Continue <ChevronRight className="w-4 h-4" /></span>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: FACE VERIFICATION */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center py-4"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
                  <Camera className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Face Verification Required</h3>
                <p className="text-sm text-gray-400 mb-6 px-4">
                  For enhanced security, please verify your identity using your camera.
                </p>
                <Button onClick={triggerDeviceAuth} className="bg-cyan-600 hover:bg-cyan-500 w-full mb-3">
                  Start Camera Scan
                </Button>
                <button onClick={() => setCurrentStep(1)} className="text-sm text-gray-500 hover:text-white transition-colors">
                  Back to Email
                </button>
              </motion.div>
            )}

            {/* STEP 3: PASSWORD */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <div className="flex items-center gap-2 mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs text-gray-400">Authenticating as</p>
                    <p className="text-sm font-medium text-white truncate">{emailValue}</p>
                  </div>
                  <button onClick={() => { setCurrentStep(1); setDeviceVerified(false); }} className="ml-auto text-xs text-cyan-400 hover:underline">Change</button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label className="block mb-1.5 text-sm text-gray-300">Additional Authentication</label>
                    <div className="relative">
                      <Input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        icon={<Lock className="w-4 h-4" />}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleKeyUp}
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

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('analyzing')}</span>
                    ) : (
                      t('signInSecurely')
                    )}
                  </Button>
                </form>

                <div className="mt-4 flex justify-center text-xs">
                  <button onClick={() => router.push('/forgot-password')} className="text-gray-400 hover:text-cyan-400 transition-colors">
                    {t('forgotPassword')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security indicators */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Camera className={`w-3.5 h-3.5 ${deviceVerified ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span>{deviceVerified ? 'Verified' : requiresFace ? 'Required' : 'Optional'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className={`w-3.5 h-3.5 ${location ? 'text-emerald-400' : 'text-amber-400'}`} />
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div onClick={() => { stopCamera(); setShowDeviceModal(false); setDeviceAuthStep('idle'); }} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#0f0f23]/95 border border-white/10 rounded-2xl shadow-2xl shadow-cyan-500/10 p-8 backdrop-blur-xl"
            >
              <button
                onClick={() => {
                  stopCamera();
                  setShowDeviceModal(false);
                  setDeviceAuthStep('idle');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
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

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">{getAuthStepMessage().title}</h3>
                <p className="text-sm text-gray-400">{getAuthStepMessage().desc}</p>
              </div>

              {(deviceAuthStep === 'prompting' || deviceAuthStep === 'verifying') && (
                <div className="relative aspect-video bg-black rounded-xl border border-white/10 overflow-hidden mb-6">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    onPlay={handleVideoPlay}
                    className="absolute inset-0 w-full h-full object-cover" 
                    style={{ transform: 'scaleX(-1)' }} 
                  />
                  <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                    style={{ transform: 'scaleX(-1)' }} 
                  />
                </div>
              )}
              
              {deviceAuthStep === 'prompting' && (
                <Button 
                  onClick={captureAndVerify}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl transition-all duration-200 mb-6"
                >
                  <Camera className="w-5 h-5 mr-2" /> Capture & Verify
                </Button>
              )}

              {deviceAuthStep === 'verifying' && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full"
                  />
                </div>
              )}

              {(deviceAuthStep === 'failed' || deviceAuthStep === 'camera_blocked') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 mt-6 w-full">
                  <Button
                    onClick={() => {
                      setShowDeviceModal(false);
                      setDeviceAuthStep('idle');
                      setTimeout(triggerDeviceAuth, 300);
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-200"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      stopCamera();
                      setShowDeviceModal(false);
                      setDeviceAuthStep('idle');
                    }}
                    variant="outline"
                    className="w-full border-white/10 hover:bg-white/5 text-gray-300 font-medium py-3 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      stopCamera();
                      setShowDeviceModal(false);
                      setDeviceAuthStep('idle');
                      setCurrentStep(1); // Go back to email
                    }}
                    variant="ghost"
                    className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-white/5 font-medium py-3 rounded-xl transition-all duration-200"
                  >
                    Back to Email
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
