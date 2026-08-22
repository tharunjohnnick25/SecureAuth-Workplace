import { createClient } from '@supabase/supabase-js';

// Safe CSV escaping to prevent formula injection
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Prevent CSV Injection
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  // Escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));
  return [headerRow, ...dataRows].join('\n');
}

export async function generateCsvReport(reportType: string, companyId: string, parameters: Record<string, unknown> = {}): Promise<string> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let headers: string[] = [];
  let rows: unknown[][] = [];

  switch (reportType) {
    case 'EMPLOYEES':
      let employeesQuery = adminClient
        .from('users')
        .select(`
          id,
          employee_id,
          full_name,
          email,
          department,
          designation,
          status,
          date_of_joining
        `)
        .eq('company_id', companyId);

      if (typeof parameters.department === 'string' && parameters.department) {
        employeesQuery = employeesQuery.eq('department', parameters.department);
      }

      const { data: employees } = await employeesQuery;

      headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Status', 'Joining Date'];
      rows = (employees || []).map(emp => [
        emp.employee_id,
        emp.full_name,
        emp.email,
        emp.department,
        emp.designation,
        emp.status,
        emp.date_of_joining
      ]);
      break;

    case 'SECURITY_EVENTS':
      const { data: events } = await adminClient
        .from('security_events')
        .select(`
          id,
          event_type,
          severity,
          status,
          created_at,
          ip_address,
          users:user_id(email)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1000); // Bounded limit to prevent memory exhaustion

      headers = ['Date', 'Event Type', 'Severity', 'Status', 'User Email', 'IP Address', 'Event ID'];
      rows = (events || []).map(ev => {
        const eventUser = ev.users as unknown as { email?: string } | null;
        return [
          new Date(ev.created_at).toISOString(),
          ev.event_type,
          ev.severity,
          ev.status,
          eventUser?.email || 'N/A',
          ev.ip_address || '',
          ev.id
        ];
      });
      break;
      
    case 'ATTENDANCE':
      const { data: attendanceData } = await adminClient
        .from('attendance')
        .select(`
          date,
          check_in,
          check_out,
          status,
          users:user_id(full_name, employee_id)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .limit(1000);

      headers = ['Date', 'Employee ID', 'Name', 'Check In', 'Check Out', 'Status'];
      rows = (attendanceData || []).map(att => {
        const attUser = att.users as unknown as { full_name?: string; employee_id?: string } | null;
        return [
          att.date,
          attUser?.employee_id,
          attUser?.full_name,
          att.check_in ? new Date(att.check_in).toISOString() : '',
          att.check_out ? new Date(att.check_out).toISOString() : '',
          att.status
        ];
      });
      break;

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }

  return buildCSV(headers, rows);
}
