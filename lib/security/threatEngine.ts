import { createClient } from '@supabase/supabase-js';

export interface ThreatEventPayload {
  company_id: string;
  user_id: string;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip_address?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Centralized function to create security events with deduplication.
 */
export async function createSecurityEvent(payload: ThreatEventPayload) {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Deduplication check: Has this exact event_type occurred for this user in the last 15 minutes?
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000).toISOString();
    
    const { data: existingEvents } = await adminClient
      .from('security_events')
      .select('id')
      .eq('company_id', payload.company_id)
      .eq('user_id', payload.user_id)
      .eq('event_type', payload.event_type)
      .gte('created_at', fifteenMinutesAgo)
      .limit(1);

    if (existingEvents && existingEvents.length > 0) {
      // Event already logged recently, deduplicate to prevent SOC flooding
      return { deduplicated: true };
    }

    const { data: newEvent, error } = await adminClient
      .from('security_events')
      .insert({
        company_id: payload.company_id,
        user_id: payload.user_id,
        event_type: payload.event_type,
        severity: payload.severity,
        ip_address: payload.ip_address,
        details: payload.details,
        metadata: payload.metadata,
        status: 'OPEN'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create security event:', error);
      return null;
    }

    return newEvent;
  } catch (err) {
    console.error('Exception creating security event:', err);
    return null;
  }
}

/**
 * Detects brute force attempts (multiple failures in short time window).
 */
export async function detectBruteForce(
  userId: string,
  companyId: string,
  ipAddress: string
): Promise<boolean> {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000).toISOString();

    const { data: failures, error } = await adminClient
      .from('login_history')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'FAIL')
      .gte('created_at', fifteenMinutesAgo);

    if (error) return false;

    // Threshold: 5 failures in 15 minutes
    if (failures && failures.length >= 5) {
      await createSecurityEvent({
        company_id: companyId,
        user_id: userId,
        event_type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        ip_address: ipAddress,
        details: { failure_count: failures.length, time_window_minutes: 15 }
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error detecting brute force:', err);
    return false;
  }
}

/**
 * Helper to calculate distance between two coordinates in kilometers using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Detects impossible travel between consecutive successful logins.
 */
export async function detectImpossibleTravel(
  userId: string,
  companyId: string,
  ipAddress: string,
  newLocation: { latitude: number; longitude: number }
): Promise<boolean> {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the most recent SUCCESSFUL login before this one
    const { data: lastLogin } = await adminClient
      .from('login_history')
      .select('latitude, longitude, created_at')
      .eq('user_id', userId)
      .eq('status', 'SUCCESS')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastLogin) return false;

    const distanceKm = calculateDistance(
      lastLogin.latitude,
      lastLogin.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    if (distanceKm < 50) return false; // Ignore small city-level jumps

    const timeDiffHours = (Date.now() - new Date(lastLogin.created_at).getTime()) / (1000 * 60 * 60);
    if (timeDiffHours <= 0) return false;

    const speedKmh = distanceKm / timeDiffHours;

    // Commercial flights max out around 900-1000 km/h. If speed is > 1000 km/h, it's impossible.
    if (speedKmh > 1000) {
      await createSecurityEvent({
        company_id: companyId,
        user_id: userId,
        event_type: 'IMPOSSIBLE_TRAVEL',
        severity: 'HIGH',
        ip_address: ipAddress,
        details: {
          distance_km: distanceKm,
          time_diff_hours: timeDiffHours,
          calculated_speed_kmh: speedKmh,
          previous_location: { lat: lastLogin.latitude, lon: lastLogin.longitude }
        }
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error detecting impossible travel:', err);
    return false;
  }
}
