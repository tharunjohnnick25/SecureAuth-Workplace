import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json({
        all: [{ id: 'mock-totp-factor', type: 'totp' }],
        totp: [{ id: 'mock-totp-factor', type: 'totp' }],
        phone: [],
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      all: data?.all || [],
      totp: data?.totp || [],
      phone: data?.phone || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
