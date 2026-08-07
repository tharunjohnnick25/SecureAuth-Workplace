import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextRequest, NextResponse } from 'next/server';

const rpName = 'SecureAuth Workplace';
const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_ORIGIN || `http://${rpID}:3000`;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const supabase = await createServerSupabaseClient();

    // Fetch user credentials from DB
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: credentials } = await supabase
      .from('user_credentials')
      .select('credential_id')
      .eq('user_id', user.id);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: credentials?.map(c => ({
        id: c.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Force platform (FaceID/TouchID)
      },
    });

    // Store challenge in session or temporary DB record
    // For demo, we return it. In prod, store it for verification step.
    
    return NextResponse.json(options);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
