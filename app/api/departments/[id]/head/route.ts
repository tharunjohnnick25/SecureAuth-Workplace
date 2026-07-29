import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { head_id } = await req.json();

    if (head_id) {
      const { data: user } = await supabase.from('users').select('id, status, full_name').eq('id', head_id).single();
      if (!user) return NextResponse.json({ error: 'Employee not found', success: false }, { status: 404 });
      if (user.status !== 'Active') {
        return NextResponse.json({ error: 'Only active employees can be department heads', success: false }, { status: 400 });
      }
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString(), head: head_id || null };

    const { data, error } = await (supabase.from('departments') as any).update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update department head', success: false }, { status: 500 });
  }
}
