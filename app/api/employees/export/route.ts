import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

import { requireCompanyAccess } from '@/lib/auth';

export const GET = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';
    const ids = searchParams.get('ids') || '';
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';

    let query = supabase.from('users').select('*').eq('company_id', companyId);

    // Enforce Domain Isolation
    if (user?.email) {
      const userDomain = user.email.split('@')[1];
      if (userDomain) {
        query = query.ilike('email', `%@${userDomain}`);
      }
    }
    if (ids) {
      const idArray = ids.split(',');
      query = query.in('id', idArray);
    }
    if (status) query = query.eq('status', status);
    if (department) query = query.eq('department', department);

    const { data, error } = await query.order('full_name', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No employees to export', success: false }, { status: 404 });
    }

    const fields = ['employee_id', 'full_name', 'email', 'phone', 'department', 'designation', 'status', 'employment_type', 'gender', 'date_of_joining', 'blood_group'];

    const csvHeader = fields.join(',');
    const csvRows = data.map((emp: any) =>
      fields.map(f => {
        const val = emp[f] || '';
        return val.toString().includes(',') ? `"${val}"` : val;
      }).join(',')
    );
    const csv = `${csvHeader}\n${csvRows.join('\n')}`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="employees_export_${Date.now()}.${format}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Export failed', success: false }, { status: 500 });
  }
});
