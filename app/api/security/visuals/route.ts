import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

function lastDays(count: number): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  return days;
}

export async function GET(req: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const adminClient = await createAdminClient();

    const { data: { session } } = await authClient.auth.getSession();
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    
    if (!session?.user && !isMock) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = isMock ? 'mock_admin' : session!.user.id;

    let companyId = 'mock_company';
    if (!isMock) {
      const { data: profile } = await adminClient
        .from('users')
        .select('company_id, role')
        .eq('id', userId)
        .single();

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      companyId = profile.company_id;
    }

    const [
      eventsRes,
      loginsRes,
      riskRes,
      auditRes,
      sessionsRes,
      usersRes,
      tasksRes,
      approvalsRes,
    ] = await Promise.all([
      adminClient.from('security_events').select('event_type, severity, status, created_at').eq('company_id', companyId),
      adminClient.from('login_history').select('status, risk_level, created_at').eq('company_id', companyId),
      adminClient.from('risk_scores').select('score, risk_level, evaluated_at').eq('company_id', companyId),
      adminClient.from('audit_logs').select('id, action, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
      adminClient.from('sessions').select('id, user_id, is_active').eq('is_active', true),
      adminClient.from('users').select('id, role').eq('company_id', companyId),
      adminClient.from('tasks').select('id, status').eq('company_id', companyId).in('status', ['TODO', 'IN_PROGRESS']),
      adminClient.from('approvals').select('id, status').eq('status', 'PENDING'),
    ]);

    const events = eventsRes.data || [];
    const logins = loginsRes.data || [];
    const risks = riskRes.data || [];
    const audit = auditRes.data || [];
    const users = usersRes.data || [];
    const companyUserIds = new Set(users.map((u: any) => u.id));
    const activeSessions = (sessionsRes.data || []).filter((s: any) => companyUserIds.has(s.user_id));
    const activeTasks = tasksRes.data || [];
    const pendingApprovals = approvalsRes.data || [];

    const severityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    events.forEach((e: any) => {
      severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
      typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
    });

    const days = lastDays(14);
    const eventsOverTime = days.map((d) => ({
      name: d.label,
      value: events.filter((e: any) => (e.created_at || '').slice(0, 10) === d.date).length,
    }));

    const loginsOverTime = days.map((d) => ({
      name: d.label,
      value: logins.filter((l: any) => (l.created_at || '').slice(0, 10) === d.date).length,
    }));

    const riskBuckets = [
      { name: '0-20', value: 0 },
      { name: '21-40', value: 0 },
      { name: '41-60', value: 0 },
      { name: '61-80', value: 0 },
      { name: '81-100', value: 0 },
    ];
    risks.forEach((r: any) => {
      const s = Number(r.score) || 0;
      const idx = s <= 20 ? 0 : s <= 40 ? 1 : s <= 60 ? 2 : s <= 80 ? 3 : 4;
      riskBuckets[idx].value += 1;
    });

    const successfulLogins = logins.filter((l: any) => String(l.status || '').toUpperCase() === 'SUCCESS').length;
    const failedLogins = logins.length - successfulLogins;
    const avgRisk = risks.length
      ? Math.round((risks.reduce((acc: number, r: any) => acc + Number(r.score || 0), 0) / risks.length) * 10) / 10
      : 0;

    const openEvents = events.filter((e: any) => String(e.status || '').toUpperCase() === 'OPEN').length;

    const roles: Record<string, number> = {};
    users.forEach((u: any) => {
      const r = (u.role || 'employee').toLowerCase();
      roles[r] = (roles[r] || 0) + 1;
    });

    const recentActivity = [
      ...audit.slice(0, 12).map((a: any) => ({
        id: a.id,
        title: (a.action || 'AUDIT_EVENT').replace(/_/g, ' '),
        time: new Date(a.created_at).toLocaleString(),
        status: 'info' as const,
      })),
      ...events.slice(0, 8).map((e: any) => ({
        id: e.id,
        title: (e.event_type || 'SECURITY_EVENT').replace(/_/g, ' '),
        time: new Date(e.created_at).toLocaleString(),
        status: e.severity === 'high' || e.severity === 'critical' ? ('danger' as const) : ('warning' as const),
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 12);

    return NextResponse.json({
      data: {
        stats: {
          openEvents,
          totalEvents: events.length,
          avgRisk: avgRisk,
          successfulLogins,
          failedLogins,
          activeSessions: activeSessions.length,
          totalUsers: users.length,
          auditEvents: audit.length,
          activeTasks: activeTasks.length,
          pendingApprovals: pendingApprovals.length,
        },
        eventsBySeverity: SEVERITIES.map((s) => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: severityCounts[s] || 0 })).filter((x) => x.value > 0),
        eventsByStatus: STATUSES.map((s) => ({ name: s, value: statusCounts[s] || 0 })).filter((x) => x.value > 0),
        eventsByType: Object.entries(typeCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).sort((a, b) => b.value - a.value),
        eventsOverTime,
        loginsOverTime,
        riskBuckets,
        roles: Object.entries(roles).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
        recentActivity,
      },
    });
  } catch (error: any) {
    console.error('Security visuals error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
