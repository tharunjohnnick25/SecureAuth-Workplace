import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { isMockMode } from '@/lib/mock-employees';

const rpID = process.env.NEXT_PUBLIC_RP_ID || process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost';

export async function POST(req: NextRequest) {
  try {
    if (isMockMode()) {
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: [],
        userVerification: 'preferred',
      });
      return NextResponse.json(options);
    }

    const supabase = await createServerSupabaseClient();
    
    // Optional: if the user typed their email, we can limit allowed credentials.
    // If not, we allow discoverable credentials.
    let body = {};
    try { body = await req.json(); } catch(e) {}
    
    const email = (body as any).email;
    let allowCredentials: any[] = [];
    let userIdForChallenge = 'anonymous';

    if (email) {
      const { data: userProfile } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
      if (userProfile) {
        userIdForChallenge = userProfile.id;
        const { data: passkeys } = await supabase.from('passkeys').select('credential_id, transports').eq('user_id', userProfile.id);
        
        if (passkeys && passkeys.length > 0) {
          allowCredentials = passkeys.map(pk => ({
            id: Buffer.from(pk.credential_id, 'base64url'),
            type: 'public-key',
            transports: pk.transports || ['internal', 'usb', 'ble', 'nfc']
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    // Save challenge
    await supabase.from('webauthn_challenges').insert([{
      user_id: userIdForChallenge === 'anonymous' ? null : userIdForChallenge,
      challenge: options.challenge,
      type: 'login',
      expires_at: expiresAt
    }]);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('generateAuthenticationOptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
