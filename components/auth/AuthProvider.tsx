"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient, supabase } from '@/lib/supabase/client';
import { syncUserProfile } from '@/lib/user-profile';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker';
import { useProximityAuth } from '@/hooks/useProximityAuth';
import { useBluetoothProximity } from '@/hooks/useBluetoothProximity';
import { toast } from 'sonner';

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
  const [quorumRequestId, setQuorumRequestId] = useState<string | null>(null);
  const { setUser, logout } = useAuthStore();
  const router = useRouter();
  const syncingRef = useRef<string | null>(null);
  const initRef = useRef(false);

  // Initialize behavioral tracking silently for authenticated users
  useBehaviorTracker(session?.user?.id || null, session?.access_token || 'default');
  
  // Physical Security Tracking
  useProximityAuth(session?.user?.id || null);
  useBluetoothProximity(session?.user?.id || null);

  const syncUserWithProfile = async (authUser: SupabaseUser) => {
    const profile = await syncUserProfile(supabase, authUser);
    setUser({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
    });
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

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
          if (_event === 'SIGNED_OUT') {
            logout();
          }
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

  useEffect(() => {
    const handleRiskAlert = (e: any) => {
      if (e.detail === 'BLOCK' || e.detail === 'REQUIRE_MFA') {
        toast.error('Session locked due to anomalous behavior.');
        signOut();
      }
    };

    window.addEventListener('AI_RISK_ALERT', handleRiskAlert);
    return () => window.removeEventListener('AI_RISK_ALERT', handleRiskAlert);
  }, []);

  useEffect(() => {
    const handleQuorumRequired = async () => {
      if (quorumRequestId) return;
      try {
        const res = await fetch('/api/quorum', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action_type: 'HIGH_RISK_SESSION' }) 
        });
        const { data } = await res.json();
        if (data?.id) {
          setQuorumRequestId(data.id);
          toast.info('Session frozen. Waiting for admin approval...');
        }
      } catch (err) {
        log('error', 'Quorum Request', String(err));
      }
    };
    
    window.addEventListener('AI_QUORUM_REQUIRED', handleQuorumRequired);
    return () => window.removeEventListener('AI_QUORUM_REQUIRED', handleQuorumRequired);
  }, [quorumRequestId]);

  useEffect(() => {
    if (!quorumRequestId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/quorum?id=${quorumRequestId}`);
        const { data } = await res.json();
        if (data?.status === 'APPROVED') {
          setQuorumRequestId(null);
          toast.success('Admin Approval Granted! Session restored.');
        } else if (data?.status === 'REJECTED') {
          toast.error('Admin Approval Rejected. Terminating session.');
          signOut();
        }
      } catch (err) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [quorumRequestId]);

  const signOut = async () => {
    try {
      // Record check-out time before invalidating the session
      await fetch('/api/attendance/checkout', { method: 'POST' });
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
      {quorumRequestId && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f0f23] border border-blue-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <h2 className="text-2xl font-bold text-white mb-4">Multi-Party Approval Required</h2>
            <p className="text-gray-400 mb-8">Your session has been flagged as high-risk. Please wait while another administrator reviews and approves this session.</p>
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
