import { useEffect, useState } from 'react';
import { log } from '@/lib/logger';

// Example Office Coordinates (e.g., HQ)
const OFFICE_LAT = 37.7749;
const OFFICE_LNG = -122.4194;
const GEOFENCE_RADIUS_METERS = 500; // 500 meters

export function useProximityAuth(userId: string | null) {
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);

  // Helper to calculate distance in meters between two lat/lngs (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (!userId) return;
    if (!('geolocation' in navigator)) {
      log('warn', 'Geolocation', 'Geolocation API not supported in this browser.');
      return;
    }

    let watchId: number;

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const distance = calculateDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
      
      const isInside = distance <= GEOFENCE_RADIUS_METERS;
      setIsWithinGeofence(isInside);

      if (!isInside) {
        log('warn', 'ProximityAuth', `User exited geofence. Distance: ${Math.round(distance)}m`);
        // Dispatch alert if they leave the office
        window.dispatchEvent(new CustomEvent('AI_RISK_ALERT', { detail: 'REQUIRE_MFA' }));
      }
    };

    const error = (err: GeolocationPositionError) => {
      log('error', 'Geolocation', `Error: ${err.message}`);
    };

    watchId = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 10000, // 10 seconds
      timeout: 5000
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userId]);

  return { isWithinGeofence };
}
