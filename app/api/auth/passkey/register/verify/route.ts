import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { verifyRegistration } from '@/lib/auth/passkeys';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { response, name } = body;

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

        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Retrieve challenge
        const { data: challenges } = await adminClient
            .from('webauthn_challenges')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'registration')
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        const expectedChallenge = challenges?.[0]?.challenge;

        if (!expectedChallenge) {
            return NextResponse.json({ error: 'Registration challenge expired or not found. Please try again.' }, { status: 400 });
        }

        let verification;
        try {
            verification = await verifyRegistration(response, expectedChallenge);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

            // Delete the used challenge
            await adminClient.from('webauthn_challenges').delete().eq('id', challenges[0].id);

            // Store the credential securely
            const { error: insertError } = await adminClient.from('passkeys').insert({
                user_id: user.id,
                credential_id: Buffer.from(credentialID).toString('base64url'),
                public_key: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                device_type: credentialDeviceType,
                backed_up: credentialBackedUp,
                name: name || 'My Device'
            });

            if (insertError) {
                console.error("Passkey insert error:", insertError);
                return NextResponse.json({ error: 'Failed to save passkey' }, { status: 500 });
            }
            
            // Mark passkey_enabled if it exists
            await adminClient.from('users').update({ passkey_enabled: true }).eq('id', user.id);

            await logAuditEvent(
                user.id,
                null,
                {
                    action: 'PASSKEY_REGISTERED',
                    resource: 'auth.passkey',
                    details: { device_type: credentialDeviceType, name: name }
                },
                req
            );

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    } catch (error: any) {
        console.error('Registration verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
