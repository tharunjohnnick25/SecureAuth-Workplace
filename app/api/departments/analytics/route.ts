import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: departments } = await (supabase.from('departments') as any)
      .select('*').order('employee_count', { ascending: false });

    if (!departments) return NextResponse.json({ data: null, success: false }, { status: 500 });

    const allUsers = await supabase.from('users').select('id, status, department');
    const users = allUsers.data || [];

    const deptStats = departments.map((d: any) => ({
      name: d.name,
      head: d.head,
      employeeCount: d.employee_count,
      activeCount: users.filter((u: any) => u.department === d.name && u.status === 'active').length,
      inactiveCount: users.filter((u: any) => u.department === d.name && u.status !== 'active').length,
    }));

    const totalEmployees = users.filter(u => u.department).length;
    const activeEmployees = users.filter(u => u.status === 'active').length;
    const inactiveEmployees = users.filter(u => u.status !== 'active').length;

    const analytics = {
      totalDepartments: departments.length,
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      avgEmployeesPerDept: departments.length > 0 ? Number((totalEmployees / departments.length).toFixed(1)) : 0,
      largestDepartment: departments.length > 0 ? departments[0].name : null,
      smallestDepartment: departments.length > 0 ? departments[departments.length - 1].name : null,
      departments: deptStats,
    };

    return NextResponse.json({ data: analytics, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch analytics', success: false }, { status: 500 });
  }
}
