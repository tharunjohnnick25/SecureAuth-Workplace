import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isMockMode } from '@/lib/mock-mode';
import { PasskeyService } from '@/lib/services/passkeyService';

const rpName = 'SecureAuth Workplace';
const rpID = process.env.NEXT_PUBLIC_RP_ID || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost';
const origin = process.env.NEXT_PUBLIC_SITE_URL || `http://${rpID}:3000`;

export async function GET(req: NextRequest) {
  try {
    if (isMockMode()) {
      const email = req.nextUrl.searchParams.get('email') || 'admin@test';
      const userKey = String(email).toLowerCase();
      const existingPasskeys = PasskeyService.listPasskeys(userKey);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(userKey),
        userName: userKey,
        userDisplayName: userKey,
        attestationType: 'none',
        excludeCredentials: existingPasskeys.map((pk) => ({
          id: pk.credential_id,
          type: 'public-key' as const,
          ...(pk.transports && pk.transports.length
            ? { transports: pk.transports as AuthenticatorTransport[] }
            : {}),
        })),
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred',
        },
      });

      PasskeyService.saveChallenge(userKey, 'registration', options.challenge);
      return NextResponse.json(options);
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details
    const { data: userProfile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    const userEmail = userProfile?.email || user.email;
    const userName = userProfile?.full_name || userEmail;

    // Get user's existing passkeys so we can exclude them
    const { data: existingPasskeys } = await supabase
      .from('passkeys')
      .select('credential_id')
      .eq('user_id', user.id);

    const excludeCredentials = (existingPasskeys || []).map((pk) => ({
      id: pk.credential_id,
      type: 'public-key' as const,
      transports: ['internal', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[],
    }));

    // Generate options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: userEmail,
      userDisplayName: userName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      // simplewebauthn v13 uses `userID` as string or byte array, let's pass a Uint8Array representation
    });

    // Replace the userID string with Uint8Array encoding inside options if needed
    // generateRegistrationOptions returns it as string/buffer, we just store the challenge

    // Save the challenge in the DB
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
    
    // Clear old challenges for this user
    await supabase.from('webauthn_challenges').delete().eq('user_id', user.id).eq('type', 'registration');
    
    await supabase.from('webauthn_challenges').insert([{
      user_id: user.id,
      challenge: options.challenge,
      type: 'registration',
      expires_at: expiresAt
    }]);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('generateRegistrationOptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
