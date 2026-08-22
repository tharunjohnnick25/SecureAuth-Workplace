import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();

    // 1. Authenticate user and get company_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 2. Fetch employee with company_id isolation
    let query = supabase.from('users').select('*').eq('id', id);
    if (currentUser.company_id) {
        query = query.eq('company_id', currentUser.company_id);
    }
    const { data, error } = await query.single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Employee not found', success: false }, { status: 404 });

    let managerName = null;
    if (data.manager_id) {
      const { data: manager } = await supabase.from('users').select('full_name').eq('id', data.manager_id).single();
      managerName = manager?.full_name || null;
    }

    return NextResponse.json({ data: { ...data, manager_name: managerName }, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch employee', success: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const supabase = await createServerSupabaseClient();
    const adminClient = await createAdminClient();
    
    // 1. Authenticate user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check permissions: Must be admin or the user themselves or a manager claiming an employee
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role?.toUpperCase() || '');
    const isManagerClaiming = currentUser.role?.toUpperCase() === 'MANAGER' && body.manager_id === session.user.id;
    if (!isAdmin && session.user.id !== id && !isManagerClaiming) {
        return NextResponse.json({ 
            error: `Forbidden: Cannot update other users. isAdmin: ${isAdmin}, session.user.id: ${session.user.id}, targetId: ${id}, isManagerClaiming: ${isManagerClaiming}, body.manager_id: ${body.manager_id}, currentUser.role: ${currentUser.role}`, 
            success: false 
        }, { status: 403 });
    }

    // Ensure the target user is in the same org
    let targetQuery = adminClient.from('users').select('id, company_id').eq('id', id);
    if (currentUser.company_id) {
        targetQuery = targetQuery.eq('company_id', currentUser.company_id);
    }
    const { data: targetUser } = await targetQuery.maybeSingle();
    
    if (!targetUser) {
        return NextResponse.json({ error: `Employee not found or unauthorized. targetId: ${id}, currentUser.company_id: ${currentUser.company_id}`, success: false }, { status: 404 });
    }

    const { email, phone, employee_id } = body;

    // Check for duplicates within the org? Or globally?
    // Emails and phones should be globally unique or org-unique. Let's do global to be safe and match schema constraints.
    if (employee_id) {
      const { data: existing } = await supabase.from('users').select('id').eq('employee_id', employee_id).neq('id', id).maybeSingle();
      if (existing) {
        return NextResponse.json({ error: `Employee ID "${employee_id}" is already taken`, success: false }, { status: 409 });
      }
    }
    if (email) {
      const { data: existing } = await supabase.from('users').select('id').eq('email', email).neq('id', id).maybeSingle();
      if (existing) {
        return NextResponse.json({ error: `Email "${email}" is already in use`, success: false }, { status: 409 });
      }
    }
    if (phone) {
      const { data: existing } = await supabase.from('users').select('id').eq('phone', phone).neq('id', id).maybeSingle();
      if (existing) {
        return NextResponse.json({ error: `Phone number "${phone}" is already in use`, success: false }, { status: 409 });
      }
    }

    // Security: Do not allow non-admins to change sensitive fields like role or company_id
    let updateData = { ...body, updated_at: new Date().toISOString() };
    if (!isAdmin) {
        delete updateData.role;
        delete updateData.company_id;
        delete updateData.status;
        delete updateData.employee_id;
        if (isManagerClaiming && session.user.id !== id) {
            updateData = { manager_id: session.user.id, updated_at: updateData.updated_at };
        }
    }

    const { data, error } = await adminClient.from('users').update(updateData).eq('id', id).select().single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('PUT /api/employees/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update employee', success: false }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createServerSupabaseClient();
    
    // 1. Authenticate user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role?.toUpperCase() || '')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required', success: false }, { status: 403 });
    }

    // Ensure target user is in the same org
    let targetQuery = supabase.from('users').select('id').eq('id', id);
    if (currentUser.company_id) {
        targetQuery = targetQuery.eq('company_id', currentUser.company_id);
    }
    const { data: targetUser } = await targetQuery.maybeSingle();

    if (!targetUser) {
        return NextResponse.json({ error: 'Employee not found or unauthorized', success: false }, { status: 404 });
    }

    // Soft delete if possible, else hard delete. The prompt said "DO NOT delete existing data" but the endpoint is literally DELETE.
    // The users table has a `deleted_at` column from migration 016! So we soft delete.
    const { error } = await supabase.from('users').update({ 
        deleted_at: new Date().toISOString(),
        status: 'inactive'
    }).eq('id', id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete employee', success: false }, { status: 500 });
  }
}
