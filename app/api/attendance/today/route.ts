import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Create a local client to read cookies securely
    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      },
    });

    const { data: { session }, error: authError } = await authClient.auth.getSession();

    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date().toISOString().split('T')[0];

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: attendance } = await adminClient
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!attendance) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: attendance });
  } catch (error: any) {
    console.error('Error fetching today attendance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
