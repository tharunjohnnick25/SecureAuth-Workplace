/**
 * lib/user-profile.ts — Shared user-profile sync used by the OAuth callback
 * and the AuthProvider. Reads the public.users row for a Supabase user and
 * creates one on first login (OAuth users have no profile yet).
 */

import type { User } from '@supabase/supabase-js';

export interface NormalizedUser {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string | null;
}

/**
 * Returns (and upserts if needed) the public profile for an authenticated user.
 * Never throws — on failure it falls back to a minimal EMPLOYEE profile so the
 * login flow can still complete.
 */
export async function syncUserProfile(
  client: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  authUser: User
): Promise<NormalizedUser> {
  const { id: userId, email = '', user_metadata } = authUser;

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return {
      id: userId,
      email,
      role: (authUser as any).role || user_metadata?.role || 'EMPLOYEE',
      first_name: email.split('@')[0],
      last_name: '',
      full_name: email.split('@')[0],
    };
  }

  try {
    const { data: existing } = await client
      .from('users')
      .select('id, role, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      const p = existing as { id: string; role?: string; full_name?: string; avatar_url?: string | null };
      const fullName = p.full_name || '';
      return {
        id: userId,
        email,
        role: p.role || 'employee',
        first_name: fullName.split(' ')[0] || '',
        last_name: fullName.split(' ').slice(1).join(' ') || '',
        full_name: fullName,
        avatar_url: p.avatar_url,
      };
    }

    const fullName =
      user_metadata?.full_name ??
      user_metadata?.name ??
      email.split('@')[0] ??
      'User';
    const avatarUrl =
      user_metadata?.avatar_url ??
      user_metadata?.picture ??
      null;

    const { data: created } = await client
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: 'employee',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select('id, role, full_name')
      .single();

    const c = created || {};
    const storedName = c.full_name || fullName;
    return {
      id: userId,
      email,
      role: c.role || 'employee',
      first_name: storedName.split(' ')[0] || '',
      last_name: storedName.split(' ').slice(1).join(' ') || '',
      full_name: storedName,
      avatar_url: avatarUrl,
    };
  } catch {
    return { id: userId, email, role: 'employee' };
  }
}
