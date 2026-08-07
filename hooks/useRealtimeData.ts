'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { isMockMode } from '@/lib/mock-mode';

function getMockData(table: string) {
  if (table === 'alerts') {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: `alert-${i}`,
      type: ['brute_force', 'unauthorized_access', 'suspicious_login', 'malware_detected', 'geo_anomaly'][Math.floor(Math.random() * 5)],
      severity: ['critical', 'warning', 'info'][Math.floor(Math.random() * 3)],
      created_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    }));
  }
  if (table === 'risk_scores') {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: `score-${i}`,
      score: Math.floor(Math.random() * 100).toString(),
      evaluated_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
    }));
  }
  if (table === 'devices') {
    return [
      { id: 'dev-8f3a2b1c', device_name: 'MacBook Pro 14"', device_type: 'laptop', os: 'macOS 15.5', browser: 'Chrome 126', is_trusted: true, last_used: new Date(Date.now() - 3600000).toISOString() },
      { id: 'dev-2c7d9e10', device_name: 'iPhone 15 Pro', device_type: 'mobile', os: 'iOS 18.1', browser: 'Safari 17', is_trusted: true, last_used: new Date(Date.now() - 7200000).toISOString() },
      { id: 'dev-5a9b4c3d', device_name: 'Dell XPS 15', device_type: 'laptop', os: 'Windows 11', browser: 'Edge 126', is_trusted: false, last_used: new Date(Date.now() - 172800000).toISOString() },
      { id: 'dev-7e1f6g2h', device_name: 'iPad Air', device_type: 'tablet', os: 'iPadOS 18', browser: 'Safari 17', is_trusted: false, last_used: new Date(Date.now() - 345600000).toISOString() },
      { id: 'dev-3d5f8a2b', device_name: 'Pixel 8 Pro', device_type: 'mobile', os: 'Android 14', browser: 'Chrome 126', is_trusted: true, last_used: new Date(Date.now() - 604800000).toISOString() },
    ];
  }
  return [];
}

export function useRealtimeData<T>(
  table: string,
  queryBuilder?: (supabase: any) => any,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const supabaseRef = useRef(createClient());
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isMockMode() && (table === 'alerts' || table === 'risk_scores' || table === 'devices')) {
        if (mountedRef.current) {
          setData(getMockData(table) as unknown as T[]);
        }
        return;
      }

      const supabase = supabaseRef.current;
      let query;
      if (queryBuilder) {
        query = queryBuilder(supabase.from(table));
      } else {
        query = supabase.from(table).select('*');
      }

      const { data: result, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (mountedRef.current) {
        setData(result || []);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err);
        if (Object.keys(err).length > 0 || typeof err === 'string') {
          console.warn(`Could not fetch ${table}. Using empty fallback data.`);
        }
        setData([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    if (isMockMode() && (table === 'alerts' || table === 'risk_scores' || table === 'devices')) {
      return;
    }

    const supabase = supabaseRef.current;
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`public:${table}:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload: any) => {
          if (!mountedRef.current) return;

          if (payload.eventType === 'INSERT') {
            setData((prev) => [payload.new as T, ...prev]);
            if (table === 'notifications') {
              toast.info(`New notification: ${(payload.new as any)?.title || ''}`);
            }
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item: any) =>
                item.id === payload.new.id ? { ...item, ...payload.new } : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => prev.filter((item: any) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [table, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}
