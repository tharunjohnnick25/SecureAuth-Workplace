import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [securityEvents, threatLogs, failedLogins] = await Promise.all([
      supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('threat_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('login_logs').select('*').eq('status', 'FAILURE').order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      securityEvents: securityEvents.data || [],
      threatLogs: threatLogs.data || [],
      failedLogins: failedLogins.data || [],
      summary: {
        totalEvents: (securityEvents.data || []).length,
        totalThreats: (threatLogs.data || []).length,
        failedLogins: (failedLogins.data || []).length,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
