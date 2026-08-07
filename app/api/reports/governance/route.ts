import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      return NextResponse.json({
        success: true,
        data: {
          employees: { total: 120, active: 115, inactive: 5 },
          departments: { total: 8, distribution: { Engineering: 40, Sales: 30, HR: 10, Marketing: 20 } },
          roles: { 'Security Admin': 5, 'Developer': 60, 'Manager': 15, 'Employee': 40 },
          access_requests: { approved: 45, rejected: 12, pending: 8, total: 65 },
          devices: { total: 240, trusted: 215, untrusted: 25 },
          logins: { total: 1250, failed: 45, high_risk: 12 },
          attendance: { present: 105, absent: 5, late: 5 },
          leave: { approved: 5, pending: 2, rejected: 0 },
          compliance: { score: 98, passed_checks: 120, failed_checks: 2 },
          audit_logs: { total_events: 15420, critical_events: 23, warning_events: 145 },
          behavioural_risks: { unusual_locations: 14, multiple_failures: 45, off_hours_access: 22 },
          generated_at: new Date().toISOString(),
        }
      });
    }

    const supabase = await createAdminClient();

    // 1. Employees
    const { data: employees } = await supabase.from('users').select('status, role, department');
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

    // 2. Departments
    const { count: totalDepartments } = await supabase.from('departments').select('*', { count: 'exact', head: true });

    // 3. Access Requests
    const { data: accessRequests } = await supabase.from('employee_requests').select('status');
    const approvedRequests = accessRequests?.filter(r => r.status === 'approved' || r.status === 'APPROVED').length || 0;
    const rejectedRequests = accessRequests?.filter(r => r.status === 'rejected' || r.status === 'REJECTED').length || 0;
    const pendingRequests = accessRequests?.filter(r => r.status === 'pending' || r.status === 'PENDING').length || 0;

    // 4. Devices
    const { data: devices } = await supabase.from('devices').select('is_trusted');
    const totalDevices = devices?.length || 0;
    const trustedDevices = devices?.filter(d => d.is_trusted).length || 0;

    // 5. Logins & Risk
    const { data: logins } = await supabase.from('login_logs').select('status, risk_level, risk_score');
    const totalLogins = logins?.length || 0;
    const failedLogins = logins?.filter(l => l.status === 'FAILED' || l.status === 'failed').length || 0;
    const highRiskLogins = logins?.filter(l => (l.risk_score || 0) >= 70 || l.risk_level === 'HIGH' || l.risk_level === 'CRITICAL').length || 0;

    // 6. Attendance & Leave (Simulated from existing active employees)
    const attendanceSummary = {
      present: Math.round(activeEmployees * 0.85),
      absent: Math.round(activeEmployees * 0.05),
      late: Math.round(activeEmployees * 0.1),
    };

    const leaveSummary = {
      approved: 12,
      pending: 4,
      rejected: 2,
    };

    // 7. Compliance & Audit (Simulated)
    const complianceOverview = {
      score: 94,
      passed_checks: 45,
      failed_checks: 3,
    };

    const auditLogSummary = {
      total_events: 15420,
      critical_events: 23,
      warning_events: 145,
    };

    const behaviouralRisks = {
      unusual_locations: 14,
      multiple_failures: 45,
      off_hours_access: 22,
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
          total: (accessRequests?.length || 0),
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
