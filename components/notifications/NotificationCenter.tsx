'use client';
import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from "@/context/LanguageContext";

type NotificationItem = {
  id: string | number;
  title: string;
  description: string;
  created_at?: string;
  is_read?: boolean;
  user_id?: string;
};

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient();
    client.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) {
        setUserId(data.session.user.id);
      }
    });
  }, []);

  const { data: notifications, loading } = useRealtimeData<NotificationItem>(
    'notifications',
    (query) =>
      userId
        ? query.select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
        : query.select('*').limit(0),
    [userId]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-16 right-4 w-80 bg-slate-900 border border-white/10 rounded-lg shadow-xl z-50"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">{'Notifications'}</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">{'Loadingnotifica'}</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">{'Nonewnotificati'}</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-gray-400">{n.description}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
