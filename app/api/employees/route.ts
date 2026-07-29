import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const designation = searchParams.get('designation') || '';
    const status = searchParams.get('status') || '';
    const gender = searchParams.get('gender') || '';
    const employmentType = searchParams.get('employment_type') || '';
    const managerId = searchParams.get('manager_id') || '';
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
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
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
