import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [riskScores, threatLogs, securityEvents] = await Promise.all([
      supabase.from('ai_risk_scores').select('*').order('calculated_at', { ascending: false }).limit(100),
      supabase.from('threat_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    return NextResponse.json({
      riskScores: riskScores.data || [],
      threats: threatLogs.data || [],
      events: securityEvents.data || [],
      summary: {
        totalRiskScores: (riskScores.data || []).length,
        totalThreats: (threatLogs.data || []).length,
        totalEvents: (securityEvents.data || []).length,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
