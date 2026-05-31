import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const userRole = ((profile as any)?.role || '').toUpperCase();
    const adminRoles = ['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN'];

    if (!adminRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users, devices, loginLogs, securityEvents] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('devices').select('*').order('last_active', { ascending: false }).limit(100),
      supabase.from('login_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      users: users.data || [],
      devices: devices.data || [],
      loginLogs: loginLogs.data || [],
      securityEvents: securityEvents.data || [],
      summary: {
        totalUsers: (users.data || []).length,
        totalDevices: (devices.data || []).length,
        recentLogins: (loginLogs.data || []).length,
        recentEvents: (securityEvents.data || []).length,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
