import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess, requireRole } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const GET = requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ data: data || [], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch departments', success: false }, { status: 500 });
  }
});

export const POST = requireRole(['admin', 'super_admin'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { name, description, head } = body;

    if (!name) {
      return NextResponse.json({ error: 'Department name is required', success: false }, { status: 400 });
    }

    const { data: existing } = await supabase.from('departments').select('id').eq('company_id', companyId).eq('name', name).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: `Department "${name}" already exists in your company`, success: false }, { status: 409 });
    }

    const { data, error } = await supabase.from('departments').insert([{
      company_id: companyId,
      name,
      description,
      head: head || null
    }]).select().single();

    if (error) throw error;

    await logAuditEvent(user.id, companyId, {
      action: 'DEPARTMENT_CREATED',
      resource: 'departments',
      entity_id: data.id,
      details: { name }
    }, req);

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create department', success: false }, { status: 500 });
  }
}));

export const DELETE = requireRole(['admin', 'super_admin'], requireCompanyAccess(async (req: NextRequest, user, companyId) => {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required', success: false }, { status: 400 });
    }
    
    // Check if employees belong to this department
    const { data: department } = await supabase.from('departments').select('name').eq('id', id).eq('company_id', companyId).single();
    if (!department) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    const { count, error: countError } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('department', department.name).eq('company_id', companyId);
    
    if (count && count > 0) {
      return NextResponse.json({ error: `Cannot delete department with ${count} active employees. Reassign them first.`, success: false }, { status: 400 });
    }

    const { error } = await supabase.from('departments').delete().eq('id', id).eq('company_id', companyId);
    
    if (error) throw error;

    await logAuditEvent(user.id, companyId, {
      action: 'DEPARTMENT_DELETED',
      resource: 'departments',
      entity_id: id,
      details: { name: department.name }
    }, req);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete department', success: false }, { status: 500 });
  }
}));
