'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuth } from './AuthProvider';
import { Shield } from 'lucide-react';
import { restoreSession } from '@/lib/supabase/client';
import { useLanguage } from "@/context/LanguageContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);
const SECURITY_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN', 'SECURITY_ANALYST']);
const AUDIT_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN', 'SECURITY_ANALYST', 'HR_MANAGER']);

// Routes that must remain reachable while profile details are incomplete
const PROFILE_ROUTES = new Set(['/onboarding/details']);

// Routes that must remain reachable while the mandatory admin passkey step is pending
const PASSKEY_ROUTES = new Set(['/mfa-setup/passkey']);

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
    const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading: contextLoading, signOut } = useAuth();
  const { user, isAuthenticated, requiresBiometric } = useAuthStore();

  const hasLocalSession = typeof window !== 'undefined' ? !!restoreSession() : false;
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (!hasLocalSession && !contextLoading && !session && !isAuthenticated) {
      const timer = setTimeout(() => {
        if (!session && !isAuthenticated) {
          router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasLocalSession, contextLoading, session, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!contextLoading || session || isAuthenticated) {
      setShowLoader(false);
    }
  }, [contextLoading, session, isAuthenticated]);

  useEffect(() => {
    if (contextLoading && !session && !isAuthenticated) return;

    if (!session && !isAuthenticated) {
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if ((session || isAuthenticated) && user) {
      const userRole = (user.role || '').toUpperCase();

      if (requireAdmin && !ADMIN_ROLES.has(userRole)) {
        router.replace('/unauthorized');
        return;
      }

      const isSecurityRoute =
        pathname.startsWith('/security') ||
        pathname.startsWith('/threat-intelligence') ||
        pathname.startsWith('/incident-response') ||
        pathname.startsWith('/vulnerability-scanner') ||
        pathname.startsWith('/forensics') ||
        pathname.startsWith('/alerts-configuration');

      if (isSecurityRoute && !SECURITY_ROLES.has(userRole)) {
        router.replace('/unauthorized');
        return;
      }

      if ((pathname.startsWith('/audit-logs') || pathname.startsWith('/admin/audit')) && !AUDIT_ROLES.has(userRole)) {
        router.replace('/unauthorized');
        return;
      }

      // Mandatory profile completion for employees & managers (admins are exempt)
      const isAdmin = ADMIN_ROLES.has(userRole);
      const profileIncomplete = !isAdmin && user.status === 'INVITED';
      if (profileIncomplete && !PROFILE_ROUTES.has(pathname) && !pathname.startsWith('/onboarding/details')) {
        router.replace('/onboarding/details');
        return;
      }


    }
  }, [session, isAuthenticated, contextLoading, pathname, requireAdmin, user, router]);

  // Removed requiresBiometric redirect since we use the new Adaptive Trust Pipeline

  if (showLoader && !session && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-cyber-dark)]">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
        <p className="mt-4 text-primary/70 text-sm animate-pulse tracking-widest uppercase font-bold">
          {'Securing session'}</p>
      </div>
    );
  }

  if (!session && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-cyber-dark)]">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
        <p className="mt-4 text-primary/70 text-sm animate-pulse tracking-widest uppercase font-bold">
          {'Securing session'}</p>
      </div>
    );
  }

  return <>{children}</>;
}
