import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date'); // optional
    const requestedUserId = url.searchParams.get('userId'); // For admin/manager viewing another employee

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: caller } = await admin
      .from('users')
      .select('id, role, company_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!caller) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const role = (caller.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const isManager = role === 'MANAGER';

    let targetUserId: string | null = null;
    if (requestedUserId && requestedUserId !== user.id) {
      const { data: target } = await admin
        .from('users')
        .select('id, company_id, manager_id, role')
        .eq('id', requestedUserId)
        .maybeSingle();
      if (!target) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      if (isAdmin) {
        // Admins can only view managers
        if ((target.role || '').toUpperCase() !== 'MANAGER') {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        if (role !== 'SUPER_ADMIN' && caller.company_id && target.company_id !== caller.company_id) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        targetUserId = requestedUserId;
      } else if (isManager) {
        if (target.manager_id !== user.id) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        targetUserId = requestedUserId;
      } else {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    let query = admin
      .from('attendance')
      .select('*, users(id, full_name, email, employee_id, department, role)')
      .order('date', { ascending: false });

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else if (isAdmin) {
      // Admins see managers only
      let managerQuery = admin.from('users').select('id').eq('role', 'manager');
      if (role !== 'SUPER_ADMIN' && caller.company_id) managerQuery = managerQuery.eq('company_id', caller.company_id);
      const { data: managers } = await managerQuery;
      const managerIds = (managers || []).map(m => m.id);
      query = query.in('user_id', managerIds.length ? managerIds : ['00000000-0000-0000-0000-000000000000']);
    } else if (isManager) {
      const { data: reports } = await admin.from('users').select('id').eq('manager_id', user.id);
      const ids = (reports || []).map(r => r.id);
      query = query.in('user_id', ids);
    } else {
      query = query.eq('user_id', user.id);
    }

    if (date) query = query.eq('date', date);

    const { data: attendance, error } = await query;
    if (error) {
      // Fallback to attendance_records if attendance query fails
      let fallbackQuery = admin
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: false });
      if (targetUserId) {
        fallbackQuery = fallbackQuery.eq('employee_id', targetUserId);
      } else {
        fallbackQuery = fallbackQuery.eq('employee_id', user.id);
      }
      if (date) fallbackQuery = fallbackQuery.eq('date', date);
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) throw fallbackError;
      return NextResponse.json({ success: true, data: fallbackData });
    }

    const rows = (attendance || []).map((record) => {
      const u = record.users || {};
      let total_hours: number | null = null;
      if (record.check_in && record.check_out) {
        const ms = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
        if (ms >= 0) total_hours = Number((ms / 3600000).toFixed(2));
      }
      return {
        id: record.id,
        user_id: record.user_id,
        company_id: record.company_id,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        total_hours,
        location_in: record.location_in,
        location_out: record.location_out,
        lat: record.lat,
        lon: record.lon,
        device_info: record.device_info,
        location_valid: record.location_valid,
        status: record.status,
        verification_status: record.verification_status,
        ip_address: record.ip_address,
        created_at: record.created_at,
        updated_at: record.updated_at,
        full_name: u.full_name,
        email: u.email,
        employee_id: u.employee_id,
        department: u.department,
        role: u.role,
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// Basic Haversine formula to calculate distance between two lat/lon points in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, location, lat, lon, device_info } = body; // 'check_in' or 'check_out'
    const today = new Date().toISOString().split('T')[0];
    const targetUserId = user.id;
    const ipAddress = getClientIp(req);

    const { data: callerProfile } = await admin.from('users').select('company_id').eq('id', targetUserId).maybeSingle();

    // GPS Verification Logic
    let location_valid = true;
    let locationWarning = null;
    if (lat !== undefined && lon !== undefined) {
      const { data: dbUser } = await admin.from('users').select('allowed_lat, allowed_lon, allowed_radius').eq('id', targetUserId).maybeSingle();
      if (dbUser && dbUser.allowed_lat && dbUser.allowed_lon) {
        const distanceMeters = calculateDistance(dbUser.allowed_lat, dbUser.allowed_lon, lat, lon);
        const radius = dbUser.allowed_radius || 100;
        if (distanceMeters > radius) {
          location_valid = false;
          locationWarning = `Location outside allowed geofence by ${Math.round(distanceMeters - radius)}m.`;
        }
      }
    } else {
      location_valid = false;
      locationWarning = 'GPS coordinates not provided.';
    }

    if (type === 'check_in') {
      const { data: existing } = await admin.from('attendance').select('id').eq('user_id', targetUserId).eq('date', today).maybeSingle();
      if (existing) {
        return NextResponse.json({ success: false, error: 'Already checked in today' }, { status: 400 });
      }

      const { data: newRecord, error } = await admin.from('attendance').insert([{
        user_id: targetUserId,
        company_id: callerProfile?.company_id ?? null,
        date: today,
        check_in: new Date().toISOString(),
        location_in: location || 'Remote',
        lat: lat ?? null,
        lon: lon ?? null,
        device_info,
        location_valid,
        ip_address: ipAddress,
        verification_status: 'VERIFIED',
        status: location_valid ? 'Present' : 'Flagged'
      }]).select().single();

      if (error) {
        // Fallback to attendance_records
        const { data: fallbackRecord, error: fallbackError } = await admin.from('attendance_records').insert([{
          employee_id: targetUserId,
          date: today,
          check_in: new Date().toISOString(),
          ip_address: ipAddress,
          status: location_valid ? 'Present' : 'Flagged'
        }]).select().single();
        if (fallbackError) throw fallbackError;
        return NextResponse.json({ success: true, data: fallbackRecord, warning: locationWarning });
      }
      return NextResponse.json({ success: true, data: newRecord, warning: locationWarning });
    }

    if (type === 'check_out') {
      const { data: existing, error: checkError } = await admin.from('attendance').select('*').eq('user_id', targetUserId).eq('date', today).maybeSingle();
      if (checkError) throw checkError;
      if (!existing) {
        // Fallback to attendance_records
        const { data: fallbackExisting } = await admin.from('attendance_records').select('*').eq('employee_id', targetUserId).eq('date', today).maybeSingle();
        if (!fallbackExisting) return NextResponse.json({ success: false, error: 'No check-in found for today' }, { status: 400 });
        if (fallbackExisting.check_out) return NextResponse.json({ success: false, error: 'Already checked out today' }, { status: 400 });

        const { data: updatedFallback, error: updateFbErr } = await admin.from('attendance_records').update({
          check_out: new Date().toISOString(),
          ip_address: ipAddress,
        }).eq('id', fallbackExisting.id).select().single();
        if (updateFbErr) throw updateFbErr;
        return NextResponse.json({ success: true, data: updatedFallback });
      }
      if (existing.check_out) {
        return NextResponse.json({ success: false, error: 'Already checked out today' }, { status: 400 });
      }

      const { data: updatedRecord, error } = await admin.from('attendance').update({
        check_out: new Date().toISOString(),
        location_out: location || 'Remote',
        ip_address: ipAddress,
      }).eq('id', existing.id).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updatedRecord });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
