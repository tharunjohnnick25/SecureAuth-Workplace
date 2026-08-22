import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticationOptions } from '@/lib/auth/passkeys';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        let email = body.email;

        // If email isn't provided, try to extract it from the pending session
        if (!email) {
            const cookieStore = await cookies();
            const pendingSessionStr = cookieStore.get('mfa_pending_session')?.value;
            if (pendingSessionStr) {
                try {
                    const parsed = JSON.parse(pendingSessionStr);
                    // Just decode the JWT payload safely to find the email
                    const payloadB64 = parsed.access_token.split('.')[1];
                    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
                    email = payload.email;
                } catch (e) {
                    console.error('Failed to parse pending session for passkey login');
                }
            }
        }

        if (!email) {
            return NextResponse.json({ error: 'Email is required for passkey login' }, { status: 400 });
        }

        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        // Find user by email
        const { data: user } = await adminClient.from('users').select('id, email').eq('email', email).maybeSingle();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's registered passkeys
        const { data: passkeys } = await adminClient.from('passkeys').select('credential_id').eq('user_id', user.id);
        
        const options = await getAuthenticationOptions(
            (passkeys || []).map(p => ({ id: Buffer.from(p.credential_id, 'base64url').toString('base64') }))
        );

        // Store challenge securely
        await adminClient.from('webauthn_challenges').insert({
            user_id: user.id,
            challenge: options.challenge,
            type: 'login',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        });

        return NextResponse.json(options);
    } catch (error: any) {
        console.error('Login options error:', error);
        return NextResponse.json({ error: 'Failed to generate login options' }, { status: 500 });
    }
}
