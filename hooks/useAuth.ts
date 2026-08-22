'use client';

import { useAuth as useAuthContext } from '@/components/auth/AuthProvider';
import { useAuthStore } from '@/store/useAuthStore';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  biometric_enabled?: boolean;
}

export function useAuth() {
  const { session, isLoading: sessionLoading, signOut } = useAuthContext();
  const { user, isAuthenticated, requiresBiometric, riskLevel, logout } = useAuthStore();

  const isLoading = sessionLoading && !session && !isAuthenticated;
  const role = (user?.role || 'employee').toUpperCase();

  const isAdmin = ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN'].includes(role);
  const isSecurityAnalyst = role === 'SECURITY_ANALYST';
  const isEmployee = role === 'EMPLOYEE';

  return {
    session,
    isLoading,
    isAuthenticated: !!session && isAuthenticated,
    user,
    role,
    isAdmin,
    isSecurityAnalyst,
    isEmployee,
    requiresBiometric,
    riskLevel,
    signOut,
    logout,
  };
}
