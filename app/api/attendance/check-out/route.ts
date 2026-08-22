import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordOfficeAccess } from '@/lib/security/telemetry';

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function POST(req: Request) {
  try {
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Create a local client to read cookies securely
    const authClient = createClient(rawSupabaseUrl, rawAnonKey, {
      global: {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      },
    });

    const { data: { session }, error: authError } = await authClient.auth.getSession();

    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Use admin client for DB updates safely
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch today's record
    const { data: attendance } = await adminClient
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!attendance) {
      return NextResponse.json({ error: 'CHECK_IN_REQUIRED' }, { status: 400 });
    }

    if (attendance.check_out) {
      return NextResponse.json({ error: 'Already checked out' }, { status: 409 });
    }

    const { latitude, longitude } = await req.json().catch(() => ({}));

    // 2. Atomic Check-Out update
    const { data: updatedAttendance, error: updateError } = await adminClient
      .from('attendance')
      .update({
        check_out: new Date().toISOString(),
        location_out: (latitude && longitude) ? `${latitude},${longitude}` : null,
        ip_address: getClientIp(req),
      })
      .eq('id', attendance.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Check-out error:', updateError);
      return NextResponse.json({ error: 'Check-out failed' }, { status: 500 });
    }

    // Audit Event
    await adminClient.from('audit_logs').insert({
       company_id: attendance.company_id,
       user_id: userId,
       action: 'ATTENDANCE_CHECK_OUT',
       resource: 'attendance'
    });

    // Office access logging (best-effort)
    await recordOfficeAccess(
      adminClient,
      userId,
      'CHECK_OUT',
      attendance.location_in || null,
      attendance.device_info || null,
      true
    );

    return NextResponse.json({
      success: true,
      check_out: updatedAttendance.check_out,
      status: updatedAttendance.status
    });

  } catch (error: unknown) {
    console.error('Check-out exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
