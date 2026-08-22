import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuthentication } from '@/lib/auth/passkeys';
import { logAuditEvent } from '@/lib/audit';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { response, email } = body;

        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        let userEmail = email;
        let pendingSession: any = null;

        // Try to get email from pending session if not provided
        const cookieStore = await cookies();
        const pendingSessionStr = cookieStore.get('mfa_pending_session')?.value;
        if (pendingSessionStr) {
            try {
                pendingSession = JSON.parse(pendingSessionStr);
                const payloadB64 = pendingSession.access_token.split('.')[1];
                const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
                if (!userEmail) userEmail = payload.email;
            } catch (e) {
                console.error('Failed to parse pending session for passkey login verify');
            }
        }

        if (!userEmail) {
            return NextResponse.json({ error: 'Email is required for passkey login' }, { status: 400 });
        }

        const { data: user } = await adminClient.from('users').select('id, email, company_id').eq('email', userEmail).maybeSingle();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Retrieve challenge
        const { data: challenges } = await adminClient
            .from('webauthn_challenges')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'login')
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        const expectedChallenge = challenges?.[0]?.challenge;

        if (!expectedChallenge) {
            return NextResponse.json({ error: 'Login challenge expired or not found. Please try again.' }, { status: 400 });
        }

        // Retrieve passkey
        const { data: passkey } = await adminClient
            .from('passkeys')
            .select('*')
            .eq('credential_id', Buffer.from(response.id, 'base64').toString('base64url'))
            .maybeSingle();

        if (!passkey) {
            return NextResponse.json({ error: 'Passkey not found in database' }, { status: 400 });
        }

        let verification;
        try {
            verification = await verifyAuthentication(
                response, 
                expectedChallenge, 
                {
                    credentialID: new Uint8Array(Buffer.from(passkey.credential_id, 'base64url')),
                    credentialPublicKey: new Uint8Array(Buffer.from(passkey.public_key, 'base64')),
                    counter: Number(passkey.counter),
                    transports: passkey.transports
                }
            );
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const { verified, authenticationInfo } = verification;

        if (verified && authenticationInfo) {
            const { newCounter } = authenticationInfo;

            // Delete the used challenge
            await adminClient.from('webauthn_challenges').delete().eq('id', challenges[0].id);

            // Update signature counter
            await adminClient.from('passkeys').update({ 
                counter: newCounter,
                last_used_at: new Date().toISOString()
            }).eq('id', passkey.id);

            // If we have a pending session, hydrate it into a real session
            if (pendingSession) {
                const ssrClient = await createServerSupabaseClient();
                await ssrClient.auth.setSession({
                    access_token: pendingSession.access_token,
                    refresh_token: pendingSession.refresh_token
                });
                cookieStore.delete('mfa_pending_session');
                
                // Issue AAL2 cookie to satisfy middleware custom MFA check
                const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secure_secret_for_dev_only_2026');
                const aal2Token = await new SignJWT({ aal: 'aal2', sub: user.id })
                    .setProtectedHeader({ alg: 'HS256' })
                    .setIssuedAt()
                    .setExpirationTime('2h')
                    .sign(JWT_SECRET);
                    
                cookieStore.set('secureauth_assurance_level', aal2Token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7200,
                    path: '/'
                });
            } else {
                // If there's no pending session, it means this was used directly from a public login screen without entering password first?
                // But our architecture requires password first. So if no pending session, we fail.
                return NextResponse.json({ error: 'No pending authentication session found. Please enter your password first.' }, { status: 401 });
            }

            await logAuditEvent(
                user.id,
                user.company_id,
                {
                    action: 'PASSKEY_LOGIN_SUCCESS',
                    resource: 'auth.passkey',
                    details: { credential_id: passkey.id }
                },
                req
            );

            // Clear any OTP challenges since MFA is fulfilled
            await adminClient.from('otp_challenges').delete().eq('user_id', user.id);

            return NextResponse.json({ success: true, user });
        }

        return NextResponse.json({ error: 'Passkey verification failed' }, { status: 400 });
    } catch (error: any) {
        console.error('Login verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
