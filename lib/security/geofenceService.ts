import { createClient } from '@supabase/supabase-js';

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface GeofenceResult {
  status: 'ALLOWED' | 'BLOCKED';
  reason?: string;
}

// Earth's radius in meters
const R = 6371e3; 

function haversineDistance(loc1: LocationData, loc2: LocationData): number {
  const lat1 = loc1.latitude * Math.PI / 180;
  const lat2 = loc2.latitude * Math.PI / 180;
  const deltaLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const deltaLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

export async function evaluateGeofence(
  companyId: string,
  location?: LocationData
): Promise<GeofenceResult> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch active geofences for the company
  const { data: geofences, error } = await adminClient
    .from('geofences')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error || !geofences || geofences.length === 0) {
    // If no active geofences exist for the company, default to ALLOWED
    return { status: 'ALLOWED' };
  }

  // If the company has strict geofences but the user provides no location (e.g. denied GPS)
  if (!location) {
    // Determine if we should fail-secure or fail-open based on whether there are ALLOW geofences
    const hasAllowFences = geofences.some(gf => gf.type === 'ALLOW');
    if (hasAllowFences) {
      return { status: 'BLOCKED', reason: 'Location required by company policy, but no location provided.' };
    }
    return { status: 'ALLOWED' };
  }

  let isAllowed = false;
  let hasAllowRules = false;

  for (const gf of geofences) {
    // Country-code checks could be implemented here if integrated with IP lookup
    if (gf.latitude == null || gf.longitude == null || gf.radius_meters == null) continue;

    const distance = haversineDistance(location, { latitude: gf.latitude, longitude: gf.longitude });

    if (gf.type === 'BLOCK' && distance <= gf.radius_meters) {
       // Explicit block overrides everything
       return { status: 'BLOCKED', reason: `Location is inside a restricted area: ${gf.name}` };
    }

    if (gf.type === 'ALLOW') {
       hasAllowRules = true;
       if (distance <= gf.radius_meters) {
         isAllowed = true;
       }
    }
  }

  // If there are ALLOW rules, the user MUST be in at least one of them.
  if (hasAllowRules && !isAllowed) {
     return { status: 'BLOCKED', reason: 'Location is outside of company allowed areas.' };
  }

  return { status: 'ALLOWED' };
}
