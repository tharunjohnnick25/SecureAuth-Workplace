import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params;

    if (isMockMode()) {
      // Generate deterministic but dynamic-looking risk score for this user based on their ID
      const idHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      const isHighRisk = idHash % 5 === 0;
      const score = isHighRisk ? 65 + (idHash % 30) : 10 + (idHash % 30);
      
      let level = 'Low';
      if (score >= 80) level = 'Critical';
      else if (score >= 60) level = 'High';
      else if (score >= 30) level = 'Medium';

      const allFactors = [
        'Impossible travel detected between logins', 
        'Unusual typing cadence', 
        'Login from new untrusted device', 
        'Multiple failed login attempts',
        'OS mismatch from historical fingerprint'
      ];

      const factors = isHighRisk 
        ? [allFactors[idHash % allFactors.length], allFactors[(idHash + 1) % allFactors.length]]
        : ['Typical behavioral patterns', 'Trusted network usage'];

      // Give a breakdown
      const history = [
        { date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], score: Math.max(0, score - 5) },
        { date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], score: Math.max(0, score - 2) },
        { date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], score: Math.max(0, score + 4) },
        { date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], score: score },
        { date: new Date().toISOString().split('T')[0], score: score },
      ];

      return NextResponse.json({
        userId,
        score,
        level,
        factors,
        history,
        success: true
      });
    }

    const supabase = await createServerSupabaseClient();
    
    // In real mode, fetch the latest score from ai_risk_scores table
    const { data, error } = await supabase
      .from('ai_risk_scores')
      .select('*')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    if (!data) {
      return NextResponse.json({
        userId,
        score: 0,
        level: 'Unknown',
        factors: ['No risk telemetry available'],
        history: [],
        success: true
      });
    }

    return NextResponse.json({
      userId,
      score: data.score,
      level: data.risk_level,
      factors: data.factors?.map((f: any) => f.label) || [],
      history: [],
      success: true
    });

  } catch (err: any) {
    console.error('Failed to get user AI risk score: ', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
