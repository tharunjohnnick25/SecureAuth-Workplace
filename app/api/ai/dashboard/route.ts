import { NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isMockMode()) {
    // Generate realistic AI dashboard telemetry based on mock employees
    const employees = MockDB.employees;
    
    // Pick 3 random employees as high risk
    const shuffled = [...employees].sort(() => 0.5 - Math.random());
    const highRiskMockUsers = shuffled.slice(0, Math.min(3, shuffled.length)).map(e => {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100
      let level = 'Medium';
      if (score >= 80) level = 'Critical';
      else if (score >= 70) level = 'High';
      
      const factors = ['Impossible travel detected', 'Unusual typing cadence', 'New untrusted device', 'Multiple failed logins'];
      const factor = factors[Math.floor(Math.random() * factors.length)];
      
      return {
        id: e.id,
        email: e.email,
        score,
        level,
        factor
      };
    }).sort((a, b) => b.score - a.score);

    const baseRisk = 12 + Math.floor(Math.random() * 8);

    const mockStats = {
      totalThreatsDetected: Math.floor(Math.random() * 150) + 50,
      averageRiskScore: baseRisk,
      criticalAnomaliesCount: Math.floor(Math.random() * 5),
      highRiskUsersCount: highRiskMockUsers.length,
      compromiseProbabilityAvg: (1.5 + Math.random() * 2).toFixed(1),
      threatTrends: [
        { date: 'Mon', risk: baseRisk - 2, threats: Math.floor(Math.random() * 5) },
        { date: 'Tue', risk: baseRisk + 1, threats: Math.floor(Math.random() * 10) },
        { date: 'Wed', risk: baseRisk - 1, threats: Math.floor(Math.random() * 4) },
        { date: 'Thu', risk: baseRisk + 3, threats: Math.floor(Math.random() * 12) },
        { date: 'Fri', risk: baseRisk, threats: Math.floor(Math.random() * 7) }
      ],
      highRiskUsers: highRiskMockUsers,
      recentAnomalies: [
        { id: `anom-${Date.now()}-1`, type: 'Brute Force Attempt', severity: 'CRITICAL', userEmail: highRiskMockUsers[0]?.email || 'unknown@example.com', time: new Date().toLocaleTimeString() },
        { id: `anom-${Date.now()}-2`, type: 'Impossible Travel', severity: 'HIGH', userEmail: highRiskMockUsers[1]?.email || 'unknown@example.com', time: new Date(Date.now() - 3600000).toLocaleTimeString() },
        { id: `anom-${Date.now()}-3`, type: 'Session Hijack', severity: 'HIGH', userEmail: highRiskMockUsers[2]?.email || 'unknown@example.com', time: new Date(Date.now() - 7200000).toLocaleTimeString() }
      ].filter(a => a.userEmail !== 'unknown@example.com')
    };

    return NextResponse.json(mockStats);
  }

  return NextResponse.json(
    { error: 'AI telemetry engine is not available' },
    { status: 501 }
  );
}
