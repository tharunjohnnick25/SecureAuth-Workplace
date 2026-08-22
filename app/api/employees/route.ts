import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const GET = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
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

    let query = supabase.from('users').select('*', { count: 'exact' });

    // Enforce Company Isolation
    query = query.eq('company_id', companyId);

    // Enforce Domain Isolation to prevent cross-tenant data leakage if test companies share DB
    if (user?.email) {
      const userDomain = user.email.split('@')[1];
      if (userDomain) {
        query = query.ilike('email', `%@${userDomain}`);
      }
    }

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

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [], total: count || 0, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch employees', success: false }, { status: 500 });
  }
});

export const POST = requireRole(['admin', 'super_admin', 'manager'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { full_name, email, phone, employee_id, password } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Full name and email are required', success: false }, { status: 400 });
    }

    if (employee_id) {
      const { data: existingEmp } = await supabase.from('users').select('id').eq('employee_id', employee_id).maybeSingle();
      if (existingEmp) return NextResponse.json({ error: `Employee ID "${employee_id}" already exists`, success: false }, { status: 409 });
    }

    const { data: existingEmail } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existingEmail) return NextResponse.json({ error: `Email "${email}" already exists`, success: false }, { status: 409 });

    if (phone) {
      const { data: existingPhone } = await supabase.from('users').select('id').eq('phone', phone).maybeSingle();
      if (existingPhone) return NextResponse.json({ error: `Phone number "${phone}" already exists`, success: false }, { status: 409 });
    }
    
    let generatedEmployeeId = employee_id;
    if (!generatedEmployeeId) {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
      generatedEmployeeId = `EMP${String((count || 0) + 1).padStart(5, '0')}`;
    }

    // Dynamic import to avoid edge runtime issues if supabase-admin uses Node internals
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Generate a secure temp password if one is not provided
    const tempPassword = password || `Temp@${Math.random().toString(36).slice(-8)}`;

    // 1. Create auth.users via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm employee emails
      user_metadata: {
        full_name,
      }
    });

    if (authError || !authData.user) {
        console.error('[Employee Create Error]', authError);
        return NextResponse.json({ error: 'Failed to create authentication identity. ' + authError?.message, success: false }, { status: 500 });
    }

    // 2. The trigger `on_auth_user_created` creates the initial row in public.users.
    // Now we UPDATE it with the rest of the profile and company isolation boundaries.
    const userData: Record<string, any> = {
      ...body,
      company_id: companyId,
      updated_at: new Date().toISOString(),
      employee_id: generatedEmployeeId,
      status: 'INVITED', // NEW EMPLOYEES REQUIRE ONBOARDING
      employment_type: body.employment_type || 'Full-time'
    };
    
    // Remove properties that aren't in the database or handled differently
    delete userData.password;
    delete userData.email;
    delete userData.full_name;

    const { data, error } = await (supabaseAdmin as any)
      .from('users').update(userData).eq('id', authData.user.id).select().single();

    if (error) {
        console.error('[Employee Profile Update Error]', error);
        // We could delete auth.users here but for now just error
        return NextResponse.json({ error: 'Failed to update employee profile in database. ' + error.message, success: false }, { status: 500 });
    }

    // Audit Log
    await logAuditEvent(user.id, companyId, {
      action: 'EMPLOYEE_CREATED',
      resource: 'employees',
      entity_id: authData.user.id,
      details: { email, full_name, employee_id: generatedEmployeeId, status: 'INVITED' }
    }, req);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create employee', success: false }, { status: 500 });
  }
}));
