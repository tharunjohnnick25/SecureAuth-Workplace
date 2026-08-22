import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const { data: email, error } = await supabase
      .from('internal_emails')
      .select('*')
      .eq('id', id)
      .eq('owner_id', session.user.id)
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: email });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updateData: any = {};
    if (body.is_read !== undefined) updateData.is_read = body.is_read;
    if (body.is_starred !== undefined) updateData.is_starred = body.is_starred;
    if (body.folder !== undefined) updateData.folder = body.folder;

    const { id } = await context.params;
    const { data: updated, error } = await supabase
      .from('internal_emails')
      .update(updateData)
      .eq('id', id)
      .eq('owner_id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    // Permanent delete only affects the specific user's copy (owner_id)
    const { error } = await supabase
      .from('internal_emails')
      .delete()
      .eq('id', id)
      .eq('owner_id', session.user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
