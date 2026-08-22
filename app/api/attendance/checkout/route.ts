import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const ipAddress = getClientIp(req);
    const today = new Date().toISOString().split('T')[0];

    // Prefer the primary attendance table, fall back to attendance_records
    const { data: attendance } = await admin
      .from('attendance')
      .select('id, company_id, check_out')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (attendance && !attendance.check_out) {
      const { error } = await admin
        .from('attendance')
        .update({ check_out: new Date().toISOString(), ip_address: ipAddress })
        .eq('id', attendance.id);

      if (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Failed to record checkout', success: false }, { status: 500 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { data: fallbackRecord } = await admin
      .from('attendance_records')
      .select('id, check_out')
      .eq('employee_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (fallbackRecord && !fallbackRecord.check_out) {
      const { error } = await admin
        .from('attendance_records')
        .update({ check_out: new Date().toISOString(), ip_address: ipAddress })
        .eq('id', fallbackRecord.id);

      if (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Failed to record checkout', success: false }, { status: 500 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // No open record today — nothing to do (already checked out or no check-in)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error', success: false }, { status: 500 });
  }
}
