/**
 * lib/auth.ts — Central auth utility functions.
 *
 * Server-safe helpers used by API routes and Server Components.
 * Import the browser-side hook from @/hooks/useAuth for Client Components.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode, MockEmployees } from '@/lib/mock-employees';

// ── Role definitions ──────────────────────────────────────────────────────

import type { Role } from '@/lib/roles';
export { ROLES, ADMIN_ROLES, getRoleHomePath } from '@/lib/roles';
export type { Role } from '@/lib/roles';

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

// ── RBAC helpers ─────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  department?: string;
  managerId?: string;
}

/**
 * Retrieves the current user session (compatible with Mock Mode).
 */
export async function getUserSession(): Promise<{ user: SessionUser | null }> {
  if (isMockMode()) {
    const cookieStore = await cookies();
    const mockCookie = cookieStore.get('mock_session')?.value;
    if (!mockCookie) return { user: null };
    
    try {
      const parsed = JSON.parse(mockCookie);
      const user = MockEmployees.getById(parsed.id);
      if (!user || user.is_deleted) return { user: null };
      
      return { 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role ? user.role.toLowerCase() : 'employee',
          department: user.department,
          managerId: (user.manager_id as string) || undefined
        } 
      };
    } catch {
      return { user: null };
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return { user: null };
  
  const { data: profile } = await supabase
    .from('users')
    .select('role, department, manager_id, is_deleted')
    .eq('id', user.id)
    .single();

  if (!profile || profile.is_deleted) return { user: null };

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: profile.role ? profile.role.toLowerCase() : 'employee',
      department: profile.department,
      managerId: profile.manager_id
    }
  };
}

/**
 * HOF for Next.js Route Handlers to enforce RBAC.
 */
export function requireRole(allowedRoles: string[], handler: (req: NextRequest, user: SessionUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const { user } = await getUserSession();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role' }, { status: 403 });
    }
    
    return handler(req, user);
  };
}
