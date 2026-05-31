import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { User } from '@/types/auth';

export class AuthService {
  static async loginWithEmail(email: string, password: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      throw new Error(error?.message ?? 'Invalid credentials');
    }
    const user = await AuthService.fetchUserProfile(data.user.id);
    return { user, session: data.session };
  }

  static async handleOAuthCallback() {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      throw new Error('OAuth session not found');
    }
    const supabaseUser = data.session.user;
    const user = await AuthService.upsertOAuthUser(supabaseUser, supabaseUser.app_metadata?.provider || 'oauth');
    return { user, session: data.session };
  }

  static async logout() {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  private static async fetchUserProfile(userId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) throw new Error('User profile not found');
    return data as unknown as User;
  }

  private static async upsertOAuthUser(supabaseUser: any, provider: string) {
    const supabase = await createServerSupabaseClient();
    const { email, id, user_metadata } = supabaseUser;
    const profile = {
      id,
      email: email ?? '',
      avatar_url: user_metadata?.avatar_url ?? null,
      full_name: user_metadata?.full_name ?? user_metadata?.name ?? email?.split('@')[0] ?? '',
      role: 'employee',
    };
    const { data, error } = await supabase.from('users').upsert(profile, { onConflict: 'id' }).select().single();
    if (error) throw new Error('Failed to upsert OAuth user');
    return data as unknown as User;
  }
}
