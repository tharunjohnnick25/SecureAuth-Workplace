import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { status, reason } = await req.json();
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from('employee_requests')
      .update({ 
        status: status.toLowerCase(), 
        reason: reason || null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message, success: false }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}

