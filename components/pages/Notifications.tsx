'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Bell,
  Shield,
  Smartphone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

const IconMap: Record<string, any> = {
  Shield, Smartphone, MapPin, CheckCircle, AlertTriangle, Info,
  SECURITY: Shield,
  DEVICE: Smartphone,
  LOCATION: MapPin,
  SUCCESS: CheckCircle,
  WARNING: AlertTriangle,
  INFO: Info,
  CRITICAL: Shield,
};

export function Notifications() {
  const { user } = useAuthStore();
  const { data: dbNotifications, loading, refetch } = useRealtimeData<any>('notifications', (q) =>
    q.select('*').eq('user_id', user?.id).order('created_at', { ascending: false })
  );

  const markAsRead = async (id: string) => {
    try {
      await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id);
      refetch();
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', user?.id);
      toast.success('All notifications marked as read');
      refetch();
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      toast.success('Notification deleted');
      refetch();
    } catch {}
  };

  const displayNotifications = useMemo(() => {
    if (!dbNotifications || dbNotifications.length === 0) return [];
    return dbNotifications.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: n.created_at ? new Date(n.created_at).toLocaleString() : 'New',
      read: n.is_read ?? false,
      priority: (n.type === 'CRITICAL' ? 'high' : n.type === 'WARNING' ? 'medium' : 'low'),
      iconName: n.type || 'INFO',
    }));
  }, [dbNotifications]);

  const unreadCount = useMemo(() => displayNotifications.filter((n: any) => !n.read).length, [displayNotifications]);
  const highPriorityCount = useMemo(() => displayNotifications.filter((n: any) => n.priority === 'high').length, [displayNotifications]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold mb-2">Notifications</h1>
              <p className="text-muted-foreground">
                Stay updated with your security alerts and activity
              </p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  Mark All as Read
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <h3 className="text-2xl font-semibold">{displayNotifications.length}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <h3 className="text-2xl font-semibold">{unreadCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <h3 className="text-2xl font-semibold">{highPriorityCount}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : displayNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications yet. Security alerts and activity updates will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayNotifications.map((notification: any) => {
                    const Icon = IconMap[notification.iconName] || Info;
                    return (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-4 rounded-lg transition-colors cursor-pointer ${
                          notification.read
                            ? 'bg-input-background/20 hover:bg-input-background/30'
                            : 'bg-input-background/50 hover:bg-input-background/60 border-l-4 border-primary'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              notification.priority === 'high'
                                ? 'bg-destructive/20'
                                : notification.priority === 'medium'
                                ? 'bg-warning/20'
                                : 'bg-primary/20'
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                notification.priority === 'high'
                                  ? 'text-destructive'
                                  : notification.priority === 'medium'
                                  ? 'text-warning'
                                  : 'text-primary'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {notification.time}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
