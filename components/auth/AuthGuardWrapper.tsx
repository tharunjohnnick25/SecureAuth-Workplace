'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import AuthGuard from './AuthGuard';

// ✅ FIX: Static set — faster lookup than array.includes()
const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-otp',
  '/demo',
  '/pricing',
  '/unauthorized',
  '/reset-password',
]);

export function AuthGuardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicRoute =
    PUBLIC_ROUTES.has(pathname) ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico');

  // ✅ FIX: Removed the `mounted` state entirely.
  // The previous `if (!mounted) return null` caused a blank flash on EVERY page load.
  // Next.js App Router handles hydration properly — we don't need a mounted guard here.
  // The Zustand store is persisted, so `isAuthenticated` is available synchronously.

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const requireAdmin = pathname.startsWith('/admin');

  return (
    <AuthGuard requireAdmin={requireAdmin}>
      {children}
    </AuthGuard>
  );
}
