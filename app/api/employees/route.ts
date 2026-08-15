import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MockEmployees, isMockMode } from '@/lib/mock-employees';
import { NextRequest, NextResponse } from 'next/server';

import { MockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    if (isMockMode()) {
      const { searchParams } = new URL(req.url);
      const search = (searchParams.get('search') || '').toLowerCase();
      const department = searchParams.get('department') || '';
      const status = searchParams.get('status') || '';
      const sortBy = searchParams.get('sort_by') || 'full_name';
      const sortOrder = searchParams.get('sort_order') || 'asc';
      const domain = searchParams.get('domain') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const managerId = searchParams.get('manager_id') || '';

      let data = MockEmployees.getAll();
      if (search) {
        data = data.filter(e =>
          [e.full_name, e.email, e.employee_id, e.department, e.designation, e.phone]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(search))
        );
      }
      if (department) data = data.filter(e => e.department === department);
      if (status) data = data.filter(e => e.status === status);
      if (domain) data = data.filter(e => e.email.toLowerCase().endsWith(`@${domain.toLowerCase()}`));
      if (managerId) data = data.filter(e => e.manager_id === managerId);

      data.sort((a, b) => {
        const av = String(a[sortBy] ?? '');
        const bv = String(b[sortBy] ?? '');
        return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      });

      const total = data.length;
      const from = (page - 1) * limit;
      const pageData = data.slice(from, from + limit).map(e => {
        const dbEmp = MockDB.employees.find(x => x.id === e.id);
        return { 
          ...e,
          risk_score: dbEmp?.security_info?.risk_score || 0
        };
      });

      return NextResponse.json({ data: pageData, total, success: true });
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const designation = searchParams.get('designation') || '';
    const status = searchParams.get('status') || '';
    const gender = searchParams.get('gender') || '';
    const employmentType = searchParams.get('employment_type') || '';
    const managerId = searchParams.get('manager_id') || '';
    const domain = searchParams.get('domain') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sort_by') || 'full_name';
    const sortOrder = searchParams.get('sort_order') || 'asc';

    let query = supabase.from('users').select('*');

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%,department.ilike.%${search}%,designation.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }
    if (department) query = query.eq('department', department);
    if (designation) query = query.eq('designation', designation);
    if (status) query = query.eq('status', status);
    if (gender) query = query.eq('gender', gender);
    if (employmentType) query = query.eq('employment_type', employmentType);
    if (managerId) query = query.eq('manager_id', managerId);
    if (domain) query = query.ilike('email', `%@${domain}`);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

    const { data, error } = await query;

    if (error) throw error;

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({ data: data || [], total: count || 0, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch employees', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (isMockMode()) {
      if (!body.full_name || !body.email) {
        return NextResponse.json({ error: 'Full name and email are required', success: false }, { status: 400 });
      }
      if (MockEmployees.findByEmail(body.email)) {
        return NextResponse.json({ error: `Email "${body.email}" already exists`, success: false }, { status: 409 });
      }
      if (body.employee_id && MockEmployees.getAll().some(e => e.employee_id === body.employee_id)) {
        return NextResponse.json({ error: `Employee ID "${body.employee_id}" already exists`, success: false }, { status: 409 });
      }
      const record = MockEmployees.add({
        ...body,
        status: body.status || 'Active',
        employment_type: body.employment_type || 'Full-time',
        password: body.password || 'Welcome@123',
      });
      return NextResponse.json({ data: record, success: true }, { status: 201 });
    }

    const supabase = await createServerSupabaseClient();
    const { full_name, email, phone, employee_id } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Full name and email are required', success: false }, { status: 400 });
    }

    if (employee_id) {
      const { data: existingEmp } = await supabase.from('users').select('id').eq('employee_id', employee_id).maybeSingle();
      if (existingEmp) {
        return NextResponse.json({ error: `Employee ID "${employee_id}" already exists`, success: false }, { status: 409 });
      }
    }

    const { data: existingEmail } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existingEmail) {
      return NextResponse.json({ error: `Email "${email}" already exists`, success: false }, { status: 409 });
    }

    if (phone) {
      const { data: existingPhone } = await supabase.from('users').select('id').eq('phone', phone).maybeSingle();
      if (existingPhone) {
        return NextResponse.json({ error: `Phone number "${phone}" already exists`, success: false }, { status: 409 });
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userData: Record<string, any> = {
      ...body,
      updated_at: new Date().toISOString(),
    };
    if (!userData.employee_id) {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      userData.employee_id = `EMP${String((count || 0) + 1).padStart(5, '0')}`;
    }
    if (!userData.status) userData.status = 'Active';
    if (!userData.employment_type) userData.employment_type = 'Full-time';
    if (session) userData.id = session.user.id;

    const { data, error } = await supabase.from('users').insert([userData]).select().single();

    if (error) throw error;

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create employee', success: false }, { status: 500 });
  }
}
