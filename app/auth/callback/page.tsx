'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { syncUserProfile } from '@/lib/user-profile';
import { useAuthStore } from '@/store/useAuthStore';
import { getRoleHomePath } from '@/lib/roles';
import { Shield } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const next = searchParams.get('next');

    (async () => {
      try {
        const supabase = createClient();

        // supabase-js detects the OAuth tokens/code in the URL and completes
        // the exchange, then exposes the session here.
        const { data, error } = await supabase.auth.getSession();
        const session = data?.session;

        if (error || !session?.user) {
          router.replace(
            `/auth/error?message=${encodeURIComponent(error?.message || 'Sign in could not be completed')}`
          );
          return;
        }

        const profile = await syncUserProfile(supabase, session.user);
        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
        });

        // Persist the validated session into server cookies so API routes and
        // Server Components recognize the authenticated user.
        try {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });
        } catch {}

        const target = next || getRoleHomePath(profile.role);
        router.replace(target);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        router.replace(`/auth/error?message=${encodeURIComponent(message)}`);
      }
    })();
  }, [router, searchParams, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
        <Shield className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: '1.5s' }} />
      </div>
      <p className="mt-4 text-primary/70 text-sm animate-pulse tracking-widest uppercase font-bold">
        {'Securing your session'}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
