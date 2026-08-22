import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getRegistrationOptions } from '@/lib/auth/passkeys';

export async function POST(req: Request) {
    try {
        let supabase = await createServerSupabaseClient();
        let accessToken: string | undefined;

        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const pendingSessionStr = cookieStore.get('mfa_pending_session')?.value;
        if (pendingSessionStr) {
          try { accessToken = JSON.parse(pendingSessionStr).access_token; } catch(e) {}
        }

        if (accessToken) {
           supabase = createClient(
             process.env.NEXT_PUBLIC_SUPABASE_URL!,
             process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
             { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
           ) as any;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const options = await getRegistrationOptions({
            id: user.id,
            email: user.email || 'employee@company.com',
        });

        // Store challenge temporarily securely bypassing RLS
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await adminClient.from('webauthn_challenges').insert({
            user_id: user.id,
            challenge: options.challenge,
            type: 'registration',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        });

        return NextResponse.json(options);
    } catch (error: any) {
        console.error('Registration options error:', error);
        return NextResponse.json({ error: 'Failed to generate registration options' }, { status: 500 });
    }
}
