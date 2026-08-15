import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isMockMode } from '@/lib/mock-mode';
import { PasskeyService } from '@/lib/services/passkeyService';
import { MockEmployees, forceReload } from '@/lib/mock-employees';

const rpID = process.env.NEXT_PUBLIC_RP_ID || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost';
const origin = process.env.NEXT_PUBLIC_SITE_URL || `http://${rpID}:3000`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    if (isMockMode()) {
      const userKey = String(body.userKey || '').toLowerCase();

      const expectedChallenge = PasskeyService.consumeChallenge(userKey, 'registration');
      if (!expectedChallenge) {
        return NextResponse.json({ error: 'No active challenge found' }, { status: 400 });
      }

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch (error) {
        console.error(error);
        const msg = error instanceof Error ? error.message : 'Passkey verification failed';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      const { verified, registrationInfo } = verification;

      if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter, credentialDeviceType } = registrationInfo;
        const base64CredentialID = Buffer.from(credentialID).toString('base64url');

        PasskeyService.addPasskey({
          user_key: userKey,
          credential_id: base64CredentialID,
          public_key_hex: Buffer.from(credentialPublicKey).toString('hex'),
          device_type: credentialDeviceType || 'platform',
          counter,
          transports: body.response?.transports || [],
          created_at: new Date().toISOString(),
        });

        // Mark the mock user as enrolled so the passkey gate can be lifted
        forceReload();
        const record = MockEmployees.findByEmail(userKey) || MockEmployees.findByEmployeeId(userKey);

        if (record) {
          MockEmployees.update(record.id, {
            passkey_enrolled: true,
            passkeys_count: PasskeyService.listPasskeys(userKey).length,
          });
        } else {
          MockEmployees.add({
            email: userKey,
            full_name: 'Admin',
            role: 'ADMIN',
            employee_id: 'EMP-ADMIN01',
            profile_completed: true,
            passkey_enrolled: true,
          });
        }

        return NextResponse.json({
          verified: true,
          enrolled: true,
          user: {
            id: record?.id || `pk-${base64CredentialID.slice(0, 8)}`,
            email: record?.email || userKey,
            role: record?.role || 'ADMIN',
            first_name: record?.full_name?.split(' ')[0] || 'Admin',
            last_name: record?.full_name?.split(' ').slice(1).join(' ') || 'User',
            employee_id: record?.employee_id || 'EMP-ADMIN01',
            profile_completed: true,
            passkey_enrolled: true,
          },
        });
      }

      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
