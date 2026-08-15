import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';
import { passwordSchema } from '@/lib/validations/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    if (isMockMode()) {
      return NextResponse.json({ message: 'Password updated successfully', mock: true });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
