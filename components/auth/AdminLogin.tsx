'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, MapPin, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { toast } from 'sonner';

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

type LoginFormValues = z.infer<typeof loginSchema>;

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
  const [simulatedRisk, setSimulatedRisk] = useState<'low'|'medium'|'high'>('low');

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
          simulatedRisk,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Sign-in failed. Please check your credentials and try again.');
      }

      // Adaptive MFA: route to the ceremony the risk policy demands.
      if (result.risk) {
        const flow = resolveRiskRoute(result, '/admin/dashboard');
        if (flow.route === '/login/blocked') {
          sessionStorage.setItem('pendingRisk', JSON.stringify(result.risk));
          router.push('/login/blocked');
          return;
        }
        // First-login admin accounts provisioned with the default password must
        // change it before entering the workspace.
        if (result.user?.must_change_password) {
          storePendingAuth(result, { fingerprint, typingMetrics: metrics, location: location || undefined });
          window.location.href = '/change-password';
          return;
        }
        if (flow.completed) {
          setUser(result.user);
        } else if (flow.needsPending) {
          storePendingAuth(result, { fingerprint, typingMetrics: metrics, location: location || undefined });
        }
        window.location.href = flow.route;
        return;
      }

      if (result.requiresBiometric) {
        // Store pending auth state to pass to the next step in the pipeline
        sessionStorage.setItem('pendingAuthUser', JSON.stringify(result.user));
        sessionStorage.setItem('pendingAuthToken', result.tempToken);
        
        const securitySignals = {
          fingerprint,
          typingMetrics: metrics,
          location: location || undefined,
        };
        sessionStorage.setItem('pendingSecuritySignals', JSON.stringify(securitySignals));
        
        window.location.href = '/verify-mfa';
      } else {
        if (result.user?.must_change_password) {
          storePendingAuth(result, { fingerprint, typingMetrics: metrics, location: location || undefined });
          window.location.href = '/change-password';
          return;
        }
        setUser(result.user);
        if (result.user.status === 'INVITED') {
           window.location.href = '/onboarding/details';
        } else {
           router.push('/admin/dashboard');
        }
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
                 'Please allow location access for enhanced security.'}
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
        <div className="mt-4 flex justify-center text-xs">
          <button onClick={() => router.push('/forgot-password')} className="text-gray-400 hover:text-cyan-400 transition-colors">
            {t('forgotPassword')}
          </button>
        </div>



        {/* Security indicators */}
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <img src="/new-logo.png" className="w-4 h-4 object-contain" alt="Enterprise Security" />
            <span>{'Enterprise Security'}</span>
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
