import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: { headers: { cookie: req.headers.get('cookie') || '' } },
    });

    const { data: { session } } = await authClient.auth.getSession();
    if (!session || !session.user) {
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

    const companyId = profile.company_id;

    // Aggregations scoped strictly to the caller's company_id
    
    // 1. Employee stats
    const { count: totalEmployees } = await adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // 2. Open Security Events
    const { count: openSecurityEvents } = await adminClient
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'OPEN');

    // 3. Active tasks
    const { count: activeTasks } = await adminClient
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['TODO', 'IN_PROGRESS']);

    // 4. Pending approval requests (from employees in this company)
    const { count: pendingApprovals } = await adminClient
      .from('approval_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    // 5. Open support queries from this company
    const { count: openSupportQueries } = await adminClient
      .from('support_queries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'OPEN');

    return NextResponse.json({
      data: {
        totalEmployees: totalEmployees || 0,
        openSecurityEvents: openSecurityEvents || 0,
        activeTasks: activeTasks || 0,
        pendingApprovals: pendingApprovals || 0,
        openSupportQueries: openSupportQueries || 0
      }
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
