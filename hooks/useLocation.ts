'use client';

import { useState, useCallback } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // useCallback with [] so the function reference is stable across renders.
  // Without this, every render creates a new function object — if anything
  // depends on this reference it would cause an infinite update loop.
  const requestLocation = useCallback(() => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding using a free service (nominatim)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) throw new Error('Geocoding failed');
          const data = await response.json();
          
          setLocation({
            latitude,
            longitude,
            city: data.address.city || data.address.town || data.address.village,
            country: data.address.country,
          });
        } catch (err) {
          // Fallback to just coordinates if geocoding fails
          setLocation({ latitude, longitude });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true, // Forces precise GPS tracking
        timeout: 10000,
        maximumAge: 0 // Do not use a cached position
      }
    );
  }, []); // stable reference — no deps needed as it only uses setters

  return { location, error, loading, requestLocation };
}
