import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

const rpID = process.env.NEXT_PUBLIC_RP_ID || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost';
const origin = process.env.NEXT_PUBLIC_SITE_URL || `http://${rpID}:3000`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Get expected challenge
    const { data: challengeRecord } = await supabase
      .from('webauthn_challenges')
      .select('challenge, expires_at')
      .eq('user_id', user.id)
      .eq('type', 'registration')
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (!challengeRecord) {
      return NextResponse.json({ error: 'No active challenge found' }, { status: 400 });
    }

    if (new Date() > new Date(challengeRecord.expires_at)) {
      return NextResponse.json({ error: 'Challenge expired' }, { status: 400 });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (error: any) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

      // SimpleWebAuthn v10+ gives buffer for credentialID and credentialPublicKey
      const base64CredentialID = Buffer.from(credentialID).toString('base64url');
      const hexPublicKey = Buffer.from(credentialPublicKey).toString('hex'); // We can store as hex and convert back or bytea directly, Supabase expects hex for bytea: '\x...'
      const byteaKey = `\\x${hexPublicKey}`;

      // Insert into passkeys table
      await supabase.from('passkeys').insert([{
        user_id: user.id,
        credential_id: base64CredentialID,
        public_key: byteaKey,
        counter: counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: body.response.transports || []
      }]);

      // Delete challenge
      await supabase.from('webauthn_challenges').delete().eq('user_id', user.id).eq('type', 'registration');

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error('verifyRegistrationResponse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
