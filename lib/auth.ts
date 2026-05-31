/**
 * lib/auth.ts — Central auth utility functions.
 *
 * Server-safe helpers used by API routes and Server Components.
 * Import the browser-side hook from @/hooks/useAuth for Client Components.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';

// ── Role definitions ──────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORGANIZATION_OWNER: 'ORGANIZATION_OWNER',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  ADMIN: 'ADMIN',
  SECURITY_ANALYST: 'SECURITY_ANALYST',
  HR_MANAGER: 'HR_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  GUEST_USER: 'GUEST_USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ORGANIZATION_OWNER,
  ROLES.ORGANIZATION_ADMIN,
  ROLES.ADMIN,
];

// ── Role-based redirect helper ────────────────────────────────────────────

/**
 * Returns the home route for a given role.
 * Used in OAuth callbacks and post-login redirects.
 */
export function getRoleHomePath(role: string): string {
  const r = role.toUpperCase() as Role;
  if (ADMIN_ROLES.includes(r)) return '/admin/dashboard';
  if (r === ROLES.SECURITY_ANALYST) return '/security';
  if (r === ROLES.HR_MANAGER) return '/dashboard';
  return '/dashboard';
}

// ── Server-side session helpers ───────────────────────────────────────────

/**
 * Gets the current authenticated user from the server session.
 * Returns null if not authenticated.
 * Use in Server Components and API Route Handlers only.
 */
export async function getServerUser() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Gets the authenticated user's profile from public.users.
 * Returns null if not authenticated or no profile exists.
 */
export async function getServerUserProfile() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return profile;
  } catch {
    return null;
  }
}

/**
 * Verifies that the current server-side session has one of the required roles.
 * Returns false if not authenticated or role doesn't match.
 */
export async function hasRequiredRole(requiredRoles: Role[]): Promise<boolean> {
  try {
    const profile = await getServerUserProfile();
    if (!profile) return false;
    const role = ((profile as any).role || '').toUpperCase() as Role;
    return requiredRoles.includes(role);
  } catch {
    return false;
  }
}

// ── MFA helpers ───────────────────────────────────────────────────────────

/**
 * Returns the MFA factors enrolled for the current user.
 * Returns empty array if not authenticated.
 */
export async function getUserMfaFactors() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return [];
    return data?.all ?? [];
  } catch {
    return [];
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────

/**
 * Checks if a Supabase JWT expiry timestamp is in the past.
 */
export function isTokenExpired(expiresAt: number | undefined): boolean {
  if (!expiresAt) return true;
  return Date.now() / 1000 > expiresAt;
}
