import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [loginLogs, riskScores, devices, notifications] = await Promise.all([
      supabase.from('login_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('ai_risk_scores').select('*').eq('user_id', userId).order('calculated_at', { ascending: false }).limit(30),
      supabase.from('devices').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      loginLogs: loginLogs.data || [],
      riskScores: riskScores.data || [],
      devices: devices.data || [],
      notifications: notifications.data || [],
      summary: {
        totalLogins: (loginLogs.data || []).length,
        totalDevices: (devices.data || []).length,
        riskScore: (riskScores.data || [])[0]?.score || 0,
        riskLevel: (riskScores.data || [])[0]?.level || 'low',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
