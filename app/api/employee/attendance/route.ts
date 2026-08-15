import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date'); // optional
    const employeeIdParams = url.searchParams.get('userId'); // For admin viewing another employee

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // In mock mode, we assume the user is 'mock' unless explicitly provided
    let targetUserId = user?.id || 'mock';

    if (!isMockMode() && (authError || !user)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Basic RBAC check if querying for another user (assuming Admin)
    if (employeeIdParams && employeeIdParams !== user.id) {
       const { data: myUser } = await supabase.from('users').select('role').eq('id', user.id).single();
       if (myUser?.role === 'ADMIN' || myUser?.role === 'super_admin') {
          targetUserId = employeeIdParams;
       } else {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
       }
    }

    if (isMockMode()) {
      let attendance = (MockDB.attendance || []).filter((a: any) => a.user_id === targetUserId || a.employee_id === targetUserId);
      if (date) {
         attendance = attendance.filter((a: any) => a.date === date);
      }
      return NextResponse.json({ success: true, data: attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) });
    }

    let query = supabase.from('attendance').select('*').eq('user_id', targetUserId).order('date', { ascending: false });
    
    if (date) {
       query = query.eq('date', date);
    }

    const { data: attendance, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: attendance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, location, lat, lon, device_info, face_verified } = body; // 'check_in' or 'check_out'
    const today = new Date().toISOString().split('T')[0];
    
    // In mock mode, bypass strict verification and session requirements
    let targetUserId = user?.id || 'mock';
    if (!isMockMode() && (authError || !user)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // GPS Verification Logic
    let location_valid = true;
    let locationWarning = null;
    if (lat !== undefined && lon !== undefined && !isMockMode()) {
       const { data: dbUser } = await supabase.from('users').select('allowed_lat, allowed_lon, allowed_radius').eq('id', targetUserId).single();
       if (dbUser && dbUser.allowed_lat && dbUser.allowed_lon) {
          const distanceMeters = calculateDistance(dbUser.allowed_lat, dbUser.allowed_lon, lat, lon);
          const radius = dbUser.allowed_radius || 100;
          if (distanceMeters > radius) {
             location_valid = false;
             locationWarning = `Location outside allowed geofence by ${Math.round(distanceMeters - radius)}m.`;
          }
       }
    } else if (!isMockMode()) {
       location_valid = false;
       locationWarning = 'GPS coordinates not provided.';
    }

    if (type === 'check_in') {
      if (isMockMode()) {
        const existing = MockDB.attendance?.find((a: any) => (a.user_id === targetUserId || a.employee_id === targetUserId) && a.date === today);
        if (existing) return NextResponse.json({ success: false, error: 'Already checked in today' }, { status: 400 });
        
        const newRecord = {
          id: `att-${Date.now()}`,
          user_id: targetUserId,
          employee_id: targetUserId,
          date: today,
          check_in: new Date().toISOString(),
          check_out: null,
          location_in: location || 'Remote',
          lat,
          lon,
          device_info,
          location_valid: true,
          verification_status: 'VERIFIED',
          status: 'Present',
          created_at: new Date().toISOString()
        };
        MockDB.attendance = MockDB.attendance || [];
        MockDB.attendance.push(newRecord);
        saveMockDB();
        return NextResponse.json({ success: true, data: newRecord });
      }

      const { data: existing } = await supabase.from('attendance').select('id').eq('user_id', targetUserId).eq('date', today).single();
      if (existing) {
         return NextResponse.json({ success: false, error: 'Already checked in today' }, { status: 400 });
      }

      if (!face_verified) {
          return NextResponse.json({ success: false, error: 'Face verification failed or missing.' }, { status: 403 });
      }

      const { data: newRecord, error } = await supabase.from('attendance').insert([{
         user_id: targetUserId,
         date: today,
         check_in: new Date().toISOString(),
         location_in: location || 'Remote',
         lat,
         lon,
         device_info,
         location_valid,
         verification_status: 'VERIFIED',
         status: location_valid ? 'Present' : 'Flagged'
      }]).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: newRecord });
    } 
    
    if (type === 'check_out') {
      if (isMockMode()) {
        const existing = MockDB.attendance?.find((a: any) => (a.user_id === targetUserId || a.employee_id === targetUserId) && a.date === today);
        if (!existing) return NextResponse.json({ success: false, error: 'No check-in found for today' }, { status: 400 });
        if (existing.check_out) return NextResponse.json({ success: false, error: 'Already checked out today' }, { status: 400 });
        
        existing.check_out = new Date().toISOString();
        (existing as any).location_out = location || 'Remote';
        saveMockDB();
        return NextResponse.json({ success: true, data: existing });
      }

      const { data: existing, error: checkError } = await supabase.from('attendance').select('*').eq('user_id', targetUserId).eq('date', today).single();
      if (checkError || !existing) {
         return NextResponse.json({ success: false, error: 'No check-in found for today' }, { status: 400 });
      }
      if (existing.check_out) {
         return NextResponse.json({ success: false, error: 'Already checked out today' }, { status: 400 });
      }

      const { data: updatedRecord, error } = await supabase.from('attendance').update({
         check_out: new Date().toISOString(),
         location_out: location || 'Remote'
      }).eq('id', existing.id).select().single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updatedRecord });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
