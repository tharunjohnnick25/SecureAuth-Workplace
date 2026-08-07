import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    const { error } = await (supabase.from('attendance_records') as any)
      .update({ check_out: new Date().toISOString() })
      .match({ employee_id: session.user.id, date: today });

    if (error) {
      console.error('Checkout error:', error);
      return NextResponse.json({ error: 'Failed to record checkout', success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, success: false }, { status: 500 });
  }
}
