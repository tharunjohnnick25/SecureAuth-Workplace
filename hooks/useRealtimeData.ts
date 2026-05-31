'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
