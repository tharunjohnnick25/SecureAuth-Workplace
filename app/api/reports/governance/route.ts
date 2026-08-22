import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return NextResponse.json({
        success: true,
        data: {
          employees: { total: 42, active: 38, inactive: 4 },
          departments: { total: 5, distribution: { 'Engineering': 15, 'Sales': 10, 'Marketing': 5, 'HR': 3, 'IT': 9 } },
          roles: { 'EMPLOYEE': 35, 'MANAGER': 5, 'ADMIN': 2 },
          access_requests: { approved: 120, rejected: 15, pending: 8, total: 143 },
          devices: { total: 45, trusted: 42, untrusted: 3 },
          logins: { total: 1250, failed: 12, high_risk: 3 },
          attendance: { present: 35, absent: 3, late: 2 },
          leave: { approved: 5, pending: 2, rejected: 1 },
          compliance: { score: 98, passed_checks: 145, failed_checks: 2 },
          audit_logs: { total_events: 15420, critical_events: 5, warning_events: 45 },
          behavioural_risks: { unusual_locations: 2, multiple_failures: 5, off_hours_access: 1 },
          generated_at: new Date().toISOString(),
        }
      });
    }

    const supabase = await createServerSupabaseClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    if (!currentUser) {
       return NextResponse.json({ error: 'User not found', success: false }, { status: 404 });
    }

    const role = currentUser.role?.toUpperCase() || 'EMPLOYEE';

    // 1. Employees
    let empQuery = supabase.from('users').select('id, status, role, department, company_id');
    if (currentUser.company_id) empQuery = empQuery.eq('company_id', currentUser.company_id);
    const { data: employees } = await empQuery;

    const totalEmployees = employees?.length || 0;
    const activeEmployees = employees?.filter(e => e.status === 'Active').length || 0;
    const inactiveEmployees = totalEmployees - activeEmployees;

    const roleDistribution = employees?.reduce((acc: any, emp) => {
      acc[emp.role || 'Unknown'] = (acc[emp.role || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    const departmentDistribution = employees?.reduce((acc: any, emp) => {
      if (emp.department) acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {});

    const empIds = employees?.map(e => e.id) || [];

    // 2. Departments
    let deptsQuery = supabase.from('departments').select('id', { count: 'exact', head: true });
    if (currentUser.company_id) deptsQuery = deptsQuery.eq('company_id', currentUser.company_id);
    let { count: totalDepartments } = await deptsQuery;
    
    if (totalDepartments === null) {
       totalDepartments = Object.keys(departmentDistribution || {}).length;
    }

    // 3. Access Requests
    let accessRequests: any[] = [];
    if (empIds.length > 0) {
      const { data: reqs } = await supabase.from('employee_requests').select('status').in('user_id', empIds);
      accessRequests = reqs || [];
    }
    const approvedRequests = accessRequests.filter(r => r.status === 'approved' || r.status === 'APPROVED').length;
    const rejectedRequests = accessRequests.filter(r => r.status === 'rejected' || r.status === 'REJECTED').length;
    const pendingRequests = accessRequests.filter(r => r.status === 'pending' || r.status === 'PENDING').length;

    // 4. Devices
    let devices: any[] = [];
    if (empIds.length > 0) {
      const { data: devs } = await supabase.from('devices').select('is_trusted').in('user_id', empIds);
      devices = devs || [];
    }
    const totalDevices = devices.length;
    const trustedDevices = devices.filter(d => d.is_trusted).length;

    // 5. Logins & Risk
    let logins: any[] = [];
    if (empIds.length > 0) {
      const { data: logs } = await supabase.from('login_logs').select('status, risk_level, risk_score').in('user_id', empIds);
      logins = logs || [];
    }
    const totalLogins = logins.length;
    const failedLogins = logins.filter(l => l.status === 'FAILED' || l.status === 'failed').length;
    const highRiskLogins = logins.filter(l => (l.risk_score || 0) >= 70 || l.risk_level === 'HIGH' || l.risk_level === 'CRITICAL').length;

    // 6. Attendance
    let attendanceRecords: any[] = [];
    if (empIds.length > 0) {
      // Just getting today's attendance roughly
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: att } = await supabase.from('attendance')
        .select('status')
        .in('user_id', empIds)
        .gte('created_at', startOfDay.toISOString());
      attendanceRecords = att || [];
    }
    const attendanceSummary = {
      present: attendanceRecords.filter(a => a.status === 'present' || a.status === 'PRESENT').length,
      absent: attendanceRecords.filter(a => a.status === 'absent' || a.status === 'ABSENT').length,
      late: attendanceRecords.filter(a => a.status === 'late' || a.status === 'LATE').length,
    };

    // 7. Leave
    let leaves: any[] = [];
    if (empIds.length > 0) {
      const { data: lvs } = await supabase.from('leaves').select('status').in('user_id', empIds);
      leaves = lvs || [];
    }
    const leaveSummary = {
      approved: leaves.filter(l => l.status === 'APPROVED' || l.status === 'approved').length,
      pending: leaves.filter(l => l.status === 'PENDING' || l.status === 'pending').length,
      rejected: leaves.filter(l => l.status === 'REJECTED' || l.status === 'rejected').length,
    };

    // 8. Audit Logs
    let auditLogs: any[] = [];
    if (empIds.length > 0) {
      const { data: audits } = await supabase.from('audit_logs')
        .select('action, details')
        .in('user_id', empIds);
      auditLogs = audits || [];
    }
    
    // Attempting to deduce severity from action names or details
    const auditLogSummary = {
      total_events: auditLogs.length,
      critical_events: auditLogs.filter(a => a.action?.toUpperCase().includes('DELETE') || a.action?.toUpperCase().includes('REVOKE')).length,
      warning_events: auditLogs.filter(a => a.action?.toUpperCase().includes('FAILED') || a.action?.toUpperCase().includes('BLOCKED')).length,
    };

    // 9. Compliance & Security Events
    let securityEvents: any[] = [];
    if (empIds.length > 0) {
      const { data: events } = await supabase.from('security_events').select('severity').in('user_id', empIds);
      securityEvents = events || [];
    }
    
    const passedChecks = auditLogs.filter(a => a.action?.toUpperCase().includes('SUCCESS')).length;
    const failedChecks = securityEvents.filter(s => s.severity === 'high' || s.severity === 'critical').length + failedLogins;
    
    // Calculate a rough compliance score based on failed checks vs total users
    const maxFailedChecks = Math.max(activeEmployees, 1) * 5; 
    let computedScore = 100 - ((failedChecks / maxFailedChecks) * 100);
    if (computedScore < 0) computedScore = 0;
    if (isNaN(computedScore)) computedScore = 100;

    const complianceOverview = {
      score: role === 'EMPLOYEE' ? 100 : Math.round(computedScore),
      passed_checks: role === 'EMPLOYEE' ? 0 : passedChecks,
      failed_checks: role === 'EMPLOYEE' ? 0 : failedChecks,
    };

    // 10. Behavioural Risks (from threat_logs and anomaly_logs if they exist)
    let threatLogs: any[] = [];
    if (empIds.length > 0) {
      const { data: threats } = await supabase.from('threat_logs').select('threat_type').in('user_id', empIds);
      threatLogs = threats || [];
    }

    const behaviouralRisks = {
      unusual_locations: threatLogs.filter(t => t.threat_type?.toLowerCase().includes('location') || t.threat_type?.toLowerCase().includes('geo')).length,
      multiple_failures: threatLogs.filter(t => t.threat_type?.toLowerCase().includes('brute') || t.threat_type?.toLowerCase().includes('fail')).length,
      off_hours_access: threatLogs.filter(t => t.threat_type?.toLowerCase().includes('time') || t.threat_type?.toLowerCase().includes('hour')).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          inactive: inactiveEmployees,
        },
        departments: {
          total: totalDepartments || 0,
          distribution: departmentDistribution || {},
        },
        roles: roleDistribution || {},
        access_requests: {
          approved: approvedRequests,
          rejected: rejectedRequests,
          pending: pendingRequests,
          total: accessRequests.length,
        },
        devices: {
          total: totalDevices,
          trusted: trustedDevices,
          untrusted: totalDevices - trustedDevices,
        },
        logins: {
          total: totalLogins,
          failed: failedLogins,
          high_risk: highRiskLogins,
        },
        attendance: attendanceSummary,
        leave: leaveSummary,
        compliance: complianceOverview,
        audit_logs: auditLogSummary,
        behavioural_risks: behaviouralRisks,
        generated_at: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
