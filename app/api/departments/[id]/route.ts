import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await (supabase.from('departments') as any).select('*').eq('id', id).single();

    if (error || !data) return NextResponse.json({ error: 'Department not found', success: false }, { status: 404 });

    const { data: headUser } = await supabase.from('users').select('id, full_name, email, avatar_url').eq('id', data.head).maybeSingle();
    const activeCount = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('department', data.name).eq('status', 'active');
    const totalCount = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('department', data.name);

    return NextResponse.json({
      data: { ...data, head_details: headUser || null, active_employees: activeCount.count || 0, total_employees: totalCount.count || 0 },
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch department', success: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { name, head, description } = body;

    if (name) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2) {
        return NextResponse.json({ error: 'Department name must be at least 2 characters', success: false }, { status: 400 });
      }
      const { data: existing } = await (supabase.from('departments') as any).select('name').ilike('name', trimmed).neq('id', id);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: `Department "${trimmed}" already exists`, success: false }, { status: 409 });
      }
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (head !== undefined) updateData.head = head || null;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await (supabase.from('departments') as any).update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update department', success: false }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();

    const { data: dept } = await (supabase.from('departments') as any).select('name').eq('id', id).single();
    const { error } = await (supabase.from('departments') as any).delete().eq('id', id);
    if (error) throw error;

    if (dept?.name) {
      await supabase.from('users').update({ department: null }).eq('department', dept.name);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete department', success: false }, { status: 500 });
  }
}
