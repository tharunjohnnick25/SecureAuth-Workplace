import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { evaluateGeofence } from '@/lib/security/geofenceService';
import { recordGeoLocation, recordOfficeAccess } from '@/lib/security/telemetry';

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();

    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const ipAddress = getClientIp(req);

    // 1. Fetch employee profile and account status
    const { data: profile } = await admin
      .from('users')
      .select('company_id, role, status')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.status === 'SUSPENDED' || profile.status === 'DISABLED' || profile.status === 'INVITED') {
      return NextResponse.json({ error: `Check-in denied: Account is ${profile.status}` }, { status: 403 });
    }

    const { latitude, longitude, device_id } = await req.json().catch(() => ({}));

    // 2. Geofence Verification
    const geofenceResult = await evaluateGeofence(
      profile.company_id,
      (latitude != null && longitude != null) ? { latitude, longitude } : undefined
    );

    if (geofenceResult.status === 'BLOCKED') {
      await admin.from('security_events').insert({
        company_id: profile.company_id,
        user_id: userId,
        event_type: 'ATTENDANCE_OUTSIDE_GEOFENCE',
        severity: 'MEDIUM',
        description: geofenceResult.reason || 'Check-in blocked by geofence policy.'
      });
      return NextResponse.json({ error: 'Location policy violation', reason: geofenceResult.reason }, { status: 403 });
    }

    // 3. Leave Integration (Check if on leave today)
    const today = new Date().toISOString().split('T')[0];
    const { data: leaves } = await admin
      .from('leave_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .lte('start_date', today)
      .gte('end_date', today);

    let status = 'PRESENT';
    if (leaves && leaves.length > 0) {
      status = 'ON_LEAVE';
    }

    // 4. Atomic Check-In
    const { data: attendance, error: insertError } = await admin
      .from('attendance')
      .insert({
        user_id: userId,
        company_id: profile.company_id,
        date: today,
        check_in: new Date().toISOString(),
        location_in: (latitude && longitude) ? `${latitude},${longitude}` : null,
        lat: latitude || null,
        lon: longitude || null,
        status: status,
        device_info: { device_id: device_id || 'unknown' },
        location_valid: (latitude && longitude) ? true : false,
        ip_address: ipAddress
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // unique violation
        return NextResponse.json({ error: 'Already checked in today' }, { status: 409 });
      }
      console.error('Check-in error:', insertError);
      return NextResponse.json({ error: 'Check-in failed due to server error' }, { status: 500 });
    }

    // Audit Event
    await admin.from('audit_logs').insert({
      company_id: profile.company_id,
      user_id: userId,
      action: 'ATTENDANCE_CHECK_IN',
      resource: 'attendance',
      details: { status, location_valid: (latitude && longitude) ? true : false }
    });

    // Office access + geo logging (best-effort)
    await Promise.all([
      recordOfficeAccess(
        admin,
        userId,
        'CHECK_IN',
        (latitude && longitude) ? `${latitude},${longitude}` : null,
        { device_id: device_id || 'unknown' },
        true
      ),
      recordGeoLocation(admin, userId, device_id || null, ipAddress, latitude, longitude, false),
    ]);

    return NextResponse.json({
      success: true,
      status: attendance.status,
      check_in: attendance.check_in,
      date: attendance.date
    });

  } catch (error: unknown) {
    console.error('Check-in exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
