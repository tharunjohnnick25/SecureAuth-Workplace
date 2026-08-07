import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Basic Haversine formula to calculate distance between two lat/lon points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
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
    const { lat, lon } = body;
    
    if (lat == null || lon == null) {
        return NextResponse.json({ success: false, error: 'Missing coordinates' }, { status: 400 });
    }

    // Get last login location for this user
    const { data: lastLogins, error: fetchError } = await supabase
      .from('login_logs')
      .select('ip_address, created_at, metadata')
      .eq('user_id', user.id)
      .not('metadata->lat', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!lastLogins || lastLogins.length === 0) {
        return NextResponse.json({ success: true, is_impossible: false, reason: 'First recorded location' });
    }

    const lastLogin = lastLogins[0];
    const prevLat = lastLogin.metadata?.lat;
    const prevLon = lastLogin.metadata?.lon;
    
    if (prevLat == null || prevLon == null) {
        return NextResponse.json({ success: true, is_impossible: false, reason: 'Previous location unknown' });
    }

    const distanceKm = calculateDistance(prevLat, prevLon, lat, lon);
    
    // Time difference in hours
    const prevTime = new Date(lastLogin.created_at).getTime();
    const currTime = new Date().getTime();
    const timeDiffHours = (currTime - prevTime) / (1000 * 60 * 60);

    // Assuming average max travel speed of 900 km/h (commercial flight)
    const maxPossibleDistance = timeDiffHours * 900;

    if (distanceKm > maxPossibleDistance && distanceKm > 100) { // Add 100km buffer for GPS drift/VPNs
        // Impossible travel detected!
        // We can call trust score API here or just return it
        return NextResponse.json({ 
            success: true, 
            is_impossible: true, 
            distance: distanceKm, 
            time_hours: timeDiffHours,
            required_speed: distanceKm / timeDiffHours 
        });
    }

    return NextResponse.json({ 
        success: true, 
        is_impossible: false, 
        distance: distanceKm, 
        time_hours: timeDiffHours 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
