import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: { headers: { cookie: req.headers.get('cookie') || '' } },
    });

    const { data: { session }, error: authError } = await authClient.auth.getSession();
    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminClient
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('security_events')
      .select('*, users!inner(first_name, last_name, email)', { count: 'exact' })
      .eq('company_id', profile.company_id);

    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: events, count, error } = await query;

    if (error) {
      console.error('Error fetching SOC events:', error);
      return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 });
    }

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('SOC events error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
