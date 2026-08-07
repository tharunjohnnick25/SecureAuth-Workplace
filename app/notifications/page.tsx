'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Bell, ShieldAlert, CheckCircle2, Clock, Trash2, MailOpen } from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/Button';
import { useLanguage } from "@/context/LanguageContext";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const supabase = createClient();
  
  const [mockNotifications, setMockNotifications] = useState<any[]>([]);
  const [isMock, setIsMock] = useState(false);
  const { data: realNotifications, loading, refetch: realRefetch } = useRealtimeData('notifications', (q) => 
    q.order('created_at', { ascending: false }).limit(20)
  );

  const fetchMock = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (Array.isArray(data)) setMockNotifications(data);
    } catch (err) {}
  };

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      setIsMock(true);
      fetchMock();
    }
  }, []);

  const notifications = isMock ? mockNotifications : realNotifications;
  const refetch = isMock ? fetchMock : realRefetch;

  const markAsRead = async (id: string) => {
    if (isMock) {
      setMockNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      return;
    }
    const { error } = await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id);
    if (!error) refetch();
  };

  const deleteNotification = async (id: string) => {
    if (isMock) {
      setMockNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification removed');
      return;
    }
    const { error } = await (supabase.from('notifications') as any).delete().eq('id', id);
    if (!error) {
       toast.success('Notification removed');
       refetch();
    }
  };

  const markAllAsRead = async () => {
    if (isMock) {
      setMockNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
      return;
    }
    const { error } = await (supabase.from('notifications') as any).update({ is_read: true }).eq('is_read', false);
    if (!error) {
       toast.success('All marked as read');
       refetch();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1 tracking-tight">{'Resource center'}</h1>
              <p className="text-gray-400">{'Managesecuritya'}</p>
            </div>
            <Button onClick={markAllAsRead} variant="outline" className="border-white/10 hover:bg-white/5 gap-2">
              <MailOpen className="w-4 h-4" /> {'Markallasread'}</Button>
          </div>

          <div className="max-w-4xl space-y-4">
            {notifications?.length ? notifications.map((notif: any) => (
              <Card key={notif.id} className={`p-4 transition-all border-l-4 ${notif.is_read ? 'border-transparent opacity-60' : 'border-blue-500 bg-blue-500/5'}`}>
                <div className="flex gap-4">
                  <div className={`p-2 rounded-lg ${notif.type === 'CRITICAL' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-white">{notif.title}</h3>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{notif.message}</p>
                    <div className="flex gap-4 mt-3">
                      {!notif.is_read && (
                        <button onClick={() => markAsRead(notif.id)} className="text-xs text-blue-400 hover:underline">{'Markasread'}</button>
                      )}
                      <button onClick={() => deleteNotification(notif.id)} className="text-xs text-red-500/50 hover:text-red-400 hover:underline">{'Remove'}</button>
                    </div>
                  </div>
                </div>
              </Card>
            )) : !loading && (
              <div className="py-20 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>{'Nonewnotificati'}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
