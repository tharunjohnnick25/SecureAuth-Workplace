import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ enrolled: false });

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return NextResponse.json({ enrolled: true });
    }

    const { data: user, error } = await adminClient
      .from('users')
      .select('face_enrolled')
      .eq('email', email)
      .maybeSingle();
      
    if (error || !user) {
      return NextResponse.json({ enrolled: false });
    }
    
    return NextResponse.json({ enrolled: !!user.face_enrolled });
  } catch (err) {
    return NextResponse.json({ enrolled: false });
  }
}
