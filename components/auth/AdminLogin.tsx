'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, MapPin, Camera, CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react';
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
import { useLanguage } from '@/context/LanguageContext';
import { REGISTERED_COMPANIES, getCompanyByDomain, type Company } from '@/lib/companies';

type LoginFormValues = z.infer<typeof loginSchema>;

type DeviceAuthStep = 'idle' | 'prompting' | 'verifying' | 'success' | 'failed' | 'camera_blocked';

export function AdminLogin() {
  const router = useRouter();
  const { setUser, setRequiresBiometric } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { metrics, handleKeyDown, handleKeyUp } = useTypingBehavior();
  const [fingerprint, setFingerprint] = useState<any>(null);
  const { location, requestLocation, loading: locationLoading } = useLocation();
  const { t } = useLanguage();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    setFingerprint(getDeviceFingerprint());
    requestLocation();
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
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        toast.success(`Authenticating with ${provider}...`);
        setTimeout(() => {
          setUser({
            id: 'mock',
            email: 'tharun@tcs.com',
            role: 'ADMIN',
            first_name: 'Tharun',
            last_name: 'John',
            employee_id: 'EMP-001',
            company_id: 'c-tcs-1',
            company_name: 'Tata Consultancy Services',
            company_domain: 'tcs.com',
            company_country: 'India'
          });
          toast.success(`Successfully logged in with ${provider}`);
          router.push('/admin/dashboard');
        }, 1000);
        return;
      }

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
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
    setError(null);
    try {
      // Detect company from email domain
      const domain = data.email.split('@')[1];
      const company = selectedCompany || getCompanyByDomain(domain);
      if (company) {
        toast.info(`Authenticating for organization: ${company.name}`);
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          company_id: company?.id || null,
          company_name: company?.name || null,
          company_domain: company?.domain || domain || null,
          company_country: company?.country || null,
          role: 'ADMIN',
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
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative bg-[#0f0f23] border border-white/10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <img src="/new-logo.png" alt="SecureAuth Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-white">{t('adminLoginTitle')}</h2>
          <p className="text-gray-400 text-center text-sm">
            {t('adminLoginDesc')}
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm text-gray-300">{t('emailLabel')}</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="admin@company.com"
                icon={<Mail className="w-4 h-4" />}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  register('email').onChange(e);
                  const domain = e.target.value.split('@')[1] || '';
                  setSelectedCompany(getCompanyByDomain(domain) || null);
                }}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
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
              <label className="block mb-2 text-sm text-gray-300">{t('passwordLabel')}</label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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
              className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
              size="lg"
              disabled={isSubmitting || locationLoading}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('analyzing')}
                </span>
              ) : (
                t('signInAdmin')
              )}
            </Button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-4 flex justify-between text-xs">
          <button onClick={() => router.push('/forgot-password')} className="text-gray-400 hover:text-cyan-400 transition-colors">
            {t('forgotPassword')}
          </button>
          <button onClick={() => router.push('/signup')} className="text-cyan-400 hover:text-cyan-300 transition-colors">
            {t('createAccount')}
          </button>
        </div>

        {/* Social Login */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-gray-500">{t('orContinueWith')}</span>
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
              {'Google'}</Button>
            <Button variant="outline" onClick={() => handleSocialLogin('github')} className="gap-2 border-white/10 hover:bg-white/5">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              {'Git hub'}</Button>
          </div>
        </div>

        {/* Security indicators */}
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <img src="/new-logo.png" className="w-4 h-4 object-contain" alt="Enterprise Security" />
            <span>{'Enterprise secur'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className={`w-4 h-4 ${location ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{location ? 'Located' : 'Pending'}</span>
          </div>
        </div>
      </Card>

    </div>
  );
}
