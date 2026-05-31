'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useRealtimeData } from '@/hooks/useRealtimeData';

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  os: string;
  browser: string;
  is_trusted: boolean;
  last_active: string;
  created_at: string;
  location?: string;
  risk_score?: number;
}

export function Devices() {
  const { user } = useAuthStore();
  const { data: dbDevices, loading, refetch } = useRealtimeData<any>('devices', (q) =>
    q.select('*').eq('user_id', user?.id).order('last_active', { ascending: false })
  );

  const devices: Device[] = (dbDevices || []).map((d: any) => ({
    id: d.id,
    device_name: d.device_name || d.browser || 'Unknown Device',
    device_type: d.device_type || (d.os?.includes('Android') || d.os?.includes('iOS') ? 'mobile' : 'desktop'),
    os: d.os || 'Unknown OS',
    browser: d.browser || 'Unknown Browser',
    is_trusted: d.is_trusted || false,
    last_active: d.last_active || d.created_at,
    created_at: d.created_at,
    location: d.location || 'Unknown Location',
    risk_score: d.risk_score,
  }));

  const trustedCount = devices.filter(d => d.is_trusted).length;
  const suspiciousCount = devices.filter(d => !d.is_trusted).length;

  const toggleTrust = async (deviceId: string, currentTrust: boolean) => {
    try {
      const { error } = await (supabase.from('devices') as any)
        .update({ is_trusted: !currentTrust })
        .eq('id', deviceId);
      if (error) throw error;
      toast.success(`Device ${currentTrust ? 'untrusted' : 'trusted'}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);
      if (error) throw error;
      toast.success('Device removed');
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const DeviceIcon = ({ type }: { type: string }) => {
    const t = (type || '').toLowerCase();
    if (t === 'mobile' || t === 'phone') return <Smartphone className="w-6 h-6" />;
    if (t === 'tablet') return <Tablet className="w-6 h-6" />;
    return <Monitor className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">Device Management</h1>
            <p className="text-muted-foreground">
              Monitor and manage all devices accessing your account
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Devices</p>
                  <h3 className="text-2xl font-semibold">{devices.length}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trusted Devices</p>
                  <h3 className="text-2xl font-semibold">{trustedCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suspicious</p>
                  <h3 className="text-2xl font-semibold">{suspiciousCount}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Devices</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No devices found. Devices will appear here when you log in.
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            device.is_trusted
                              ? 'bg-primary/20 text-primary'
                              : 'bg-destructive/20 text-destructive'
                          }`}
                        >
                          <DeviceIcon type={device.device_type} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{device.device_name}</h4>
                            {device.is_trusted && (
                              <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs">
                                Trusted
                              </span>
                            )}
                            {!device.is_trusted && (
                              <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs">
                                Unknown
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {device.os} • {device.browser}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {device.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {device.last_active ? new Date(device.last_active).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!device.is_trusted && (
                          <Button variant="outline" size="sm" onClick={() => toggleTrust(device.id, device.is_trusted)}>
                            Trust Device
                          </Button>
                        )}
                        {device.is_trusted && (
                          <Button variant="outline" size="sm" onClick={() => toggleTrust(device.id, device.is_trusted)}>
                            Untrust
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => removeDevice(device.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
