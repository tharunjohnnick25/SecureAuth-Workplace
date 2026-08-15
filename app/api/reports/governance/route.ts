import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server';
import { MockEmployees } from '@/lib/mock-employees';
import { MockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const role = searchParams.get('role');

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      let allEmp = MockEmployees.getAll();
      
      if (role === 'MANAGER' && userId) {
        allEmp = allEmp.filter(e => e.manager_id === userId);
      } else if (role === 'EMPLOYEE' && userId) {
        allEmp = allEmp.filter(e => e.id === userId);
      }
      
      const empIds = allEmp.map(e => e.id);
      
      // Calculate dynamic stats
      const totalEmp = allEmp.length;
      const activeEmp = allEmp.filter(e => e.status !== 'Inactive').length;
      const depts = new Set(allEmp.map(e => e.department).filter(Boolean)).size;
      
      let deptDist: any = {};
      let roleDist: any = {};
      allEmp.forEach(e => {
        if (e.department) deptDist[e.department] = (deptDist[e.department] || 0) + 1;
        if (e.role) roleDist[e.role] = (roleDist[e.role] || 0) + 1;
      });

      const reqs = (MockDB as any).employee_requests?.filter((r: any) => empIds.includes(r.user_id)) || [];
      const leaves = (MockDB as any).leave_requests?.filter((l: any) => empIds.includes(l.user_id)) || [];
      const logins = (MockDB as any).login_logs?.filter((l: any) => empIds.includes(l.user_id)) || [];
      const devices = (MockDB as any).devices?.filter((d: any) => empIds.includes(d.user_id)) || [];

      return NextResponse.json({
        success: true,
        data: {
          employees: { total: totalEmp, active: activeEmp, inactive: totalEmp - activeEmp },
          departments: { total: depts, distribution: deptDist },
          roles: roleDist,
          access_requests: { 
            approved: reqs.filter((r: any) => r.status === 'approved' || r.status === 'APPROVED').length, 
            rejected: reqs.filter((r: any) => r.status === 'rejected' || r.status === 'REJECTED').length, 
            pending: reqs.filter((r: any) => r.status === 'pending' || r.status === 'PENDING').length, 
            total: reqs.length 
          },
          devices: { 
            total: devices.length || (role === 'ADMIN' ? 240 : role === 'EMPLOYEE' ? 2 : 15), 
            trusted: devices.filter((d: any) => d.is_trusted).length || (role === 'ADMIN' ? 215 : role === 'EMPLOYEE' ? 2 : 12), 
            untrusted: 0 
          },
          logins: { 
            total: logins.length || (role === 'ADMIN' ? 1250 : 25), 
            failed: logins.filter((l: any) => l.status === 'FAILED').length || 0, 
            high_risk: 0 
          },
          attendance: { present: activeEmp, absent: 0, late: 0 },
          leave: { 
            approved: leaves.filter((l: any) => l.status === 'Approved').length, 
            pending: leaves.filter((l: any) => l.status === 'Pending').length, 
            rejected: leaves.filter((l: any) => l.status === 'Rejected').length 
          },
          compliance: { score: role === 'EMPLOYEE' ? 100 : 98, passed_checks: 120, failed_checks: role === 'EMPLOYEE' ? 0 : 2 },
          audit_logs: { total_events: role === 'ADMIN' ? 15420 : 120, critical_events: 0, warning_events: 0 },
          behavioural_risks: { unusual_locations: 0, multiple_failures: 0, off_hours_access: 0 },
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
