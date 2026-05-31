"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient, supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { log } from '@/lib/logger';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  signOut: async () => {},
});

const SESSION_STORAGE_KEY = 'secureauth-session';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setUser, logout } = useAuthStore();
  const router = useRouter();
  const syncingRef = useRef<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setIsLoading(false);
    return;

    let mounted = true;

    const init = async () => {
      try {
        const client = createClient();
        const { data: { session: initialSession } } = await client.auth.getSession();

        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(initialSession)); } catch {}

          if (initialSession.user && syncingRef.current !== initialSession.user.id) {
            syncingRef.current = initialSession.user.id;
            await syncUserWithProfile(initialSession.user);
          }
        } else {
          setSession(null);
          try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
        }
      } catch (err) {
        log('error', 'AuthProvider.init', String(err));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        setSession(newSession);

        if (newSession) {
          try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession)); } catch {}

          if (newSession.user && syncingRef.current !== newSession.user.id) {
            syncingRef.current = newSession.user.id;
            await syncUserWithProfile(newSession.user);
          }
        } else {
          try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
          syncingRef.current = null;
          logout();
        }
      } catch (err) {
        log('error', 'AuthProvider.onAuthStateChange', String(err));
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const syncUserWithProfile = async (authUser: SupabaseUser) => {
    const { id: userId, email = '', user_metadata } = authUser;

    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id, role, full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (existing) {
        const p = existing as { id: string; role?: string; full_name?: string; avatar_url?: string };
        setUser({
          id: userId,
          email,
          role: p.role || 'employee',
          first_name: p.full_name?.split(' ')[0] || '',
          last_name: p.full_name?.split(' ').slice(1).join(' ') || '',
        });
        return;
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

      const { data: created } = await (supabase.from('users') as any)
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

      const c = (created as any) || {};
      setUser({
        id: userId,
        email,
        role: c.role || 'employee',
        first_name: (c.full_name as string | undefined)?.split(' ')[0] || fullName.split(' ')[0],
        last_name: (c.full_name as string | undefined)?.split(' ').slice(1).join(' ') || '',
      });
    } catch (error) {
      log('error', 'syncUserWithProfile', String(error));
      setUser({ id: userId, email, role: 'employee' });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      log('error', 'signOut', String(err));
    }
    syncingRef.current = null;
    logout();
    try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
