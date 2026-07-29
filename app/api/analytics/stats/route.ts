import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gt('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: failedCount } = await supabase
      .from('login_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'FAILURE')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: mfaCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('mfa_enabled', true);

    const total = userCount || 1;
    const mfaEnabledPercent = Math.round(((mfaCount || 0) / total) * 100);

    return NextResponse.json({
      data: {
        totalUsers: userCount || 0,
        activeSessions: sessionCount || 0,
        failedAttempts: failedCount || 0,
        mfaEnabledPercent,
      },
      success: true,
    });
  } catch (error: any) {
    console.error('Error fetching analytics stats:', error);
    return NextResponse.json({ error: error.message || 'Server error', success: false }, { status: 500 });
  }
}
