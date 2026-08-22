import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    if (!currentUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Fetch org users
    let usersQuery = supabase.from('users').select('id, email, full_name');
    if (currentUser.company_id) {
       usersQuery = usersQuery.eq('company_id', currentUser.company_id);
    }
    const { data: orgUsers } = await usersQuery;
    const orgUserIds = orgUsers?.map(u => u.id) || [];

    if (orgUserIds.length === 0) {
      return NextResponse.json({
         totalThreatsDetected: 0,
         averageRiskScore: 0,
         criticalAnomaliesCount: 0,
         highRiskUsersCount: 0,
         compromiseProbabilityAvg: 0,
         threatTrends: [],
         highRiskUsers: [],
         recentAnomalies: []
      });
    }

    // Fetch Risk Scores
    const { data: riskScores } = await supabase.from('ai_risk_scores')
        .select('*')
        .in('user_id', orgUserIds)
        .order('calculated_at', { ascending: false })
        .limit(100);

    // Fetch Anomaly Logs
    const { data: anomalies } = await supabase.from('anomaly_logs')
        .select('*')
        .in('user_id', orgUserIds)
        .order('detected_at', { ascending: false })
        .limit(20);

    // Fetch Threat Predictions
    const { data: predictions } = await supabase.from('threat_predictions')
        .select('*')
        .in('user_id', orgUserIds)
        .order('predicted_at', { ascending: false })
        .limit(50);

    // Calculate High Risk Users
    const latestScores = new Map();
    (riskScores || []).forEach(r => {
        if (!latestScores.has(r.user_id)) {
            latestScores.set(r.user_id, r);
        }
    });

    const highRiskUsers: any[] = [];
    let totalRisk = 0;
    Array.from(latestScores.values()).forEach(r => {
        totalRisk += r.score;
        if (r.score >= 70 || r.risk_level === 'High' || r.risk_level === 'Critical' || r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL') {
            const u = orgUsers?.find(u => u.id === r.user_id);
            const factorList = r.factors && Array.isArray(r.factors) ? r.factors : [];
            highRiskUsers.push({
                id: r.user_id,
                email: u?.email || 'Unknown',
                score: r.score,
                level: r.risk_level,
                factor: factorList[0] || 'Unknown factor'
            });
        }
    });

    const averageRiskScore = latestScores.size > 0 ? Math.round(totalRisk / latestScores.size) : 0;
    const criticalAnomaliesCount = (anomalies || []).filter(a => a.severity === 'CRITICAL' || a.severity === 'Critical').length;
    
    let totalComp = 0;
    (predictions || []).forEach(p => { totalComp += (p.compromise_probability || 0); });
    const compromiseProbabilityAvg = predictions && predictions.length > 0 ? (totalComp / predictions.length).toFixed(1) : 0;

    // Map recent anomalies
    const recentAnomalies = (anomalies || []).map(a => {
        const u = orgUsers?.find(usr => usr.id === a.user_id);
        return {
            id: a.id,
            type: a.type,
            severity: a.severity,
            userEmail: u?.email || 'Unknown',
            time: new Date(a.detected_at).toLocaleString()
        };
    });

    // Mock trend data since historical aggregate over time requires time-series bucketing
    // To make it simple we return a static mock trend for now, scaled by total anomalies
    const baseRisk = averageRiskScore || 20;
    const threatTrends = [
        { date: 'Mon', risk: Math.max(0, baseRisk - 2), threats: Math.floor((anomalies?.length || 0) * 0.1) },
        { date: 'Tue', risk: baseRisk + 1, threats: Math.floor((anomalies?.length || 0) * 0.2) },
        { date: 'Wed', risk: Math.max(0, baseRisk - 1), threats: Math.floor((anomalies?.length || 0) * 0.15) },
        { date: 'Thu', risk: baseRisk + 3, threats: Math.floor((anomalies?.length || 0) * 0.25) },
        { date: 'Fri', risk: baseRisk, threats: Math.floor((anomalies?.length || 0) * 0.3) }
    ];

    const stats = {
      totalThreatsDetected: anomalies?.length || 0,
      averageRiskScore,
      criticalAnomaliesCount,
      highRiskUsersCount: highRiskUsers.length,
      compromiseProbabilityAvg,
      threatTrends,
      highRiskUsers,
      recentAnomalies
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch AI dashboard data' }, { status: 500 });
  }
}
