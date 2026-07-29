import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Employee not found', success: false }, { status: 404 });

    let managerName = null;
    if (data.manager_id) {
      const { data: manager } = await supabase.from('users').select('full_name').eq('id', data.manager_id).single();
      managerName = manager?.full_name || null;
    }

    return NextResponse.json({ data: { ...data, manager_name: managerName }, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch employee', success: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { email, phone, employee_id } = body;

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

    const { data, error } = await supabase.from('users').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update employee', success: false }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete employee', success: false }, { status: 500 });
  }
}
