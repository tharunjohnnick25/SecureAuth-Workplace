'use client';

import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Monitor, MapPin, Clock, Shield, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from "@/context/LanguageContext";

const activityData = [
  { time: '00:00', activity: 5 },
  { time: '04:00', activity: 2 },
  { time: '08:00', activity: 15 },
  { time: '12:00', activity: 25 },
  { time: '16:00', activity: 18 },
  { time: '20:00', activity: 10 },
];

export function DeviceDetails() {
    const { t } = useLanguage();
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Device details'}</h1>
            <p className="text-muted-foreground">{'Mac book pro devic'}{id}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <Monitor className="w-12 h-12 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{'Device type'}</p>
                  <h3 className="text-xl font-semibold">{'Desktop'}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <MapPin className="w-12 h-12 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">{'Location'}</p>
                  <h3 className="text-xl font-semibold">{'New york us'}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <Clock className="w-12 h-12 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">{'Last active'}</p>
                  <h3 className="text-xl font-semibold">{t('2minago_794')}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{'Activity timelin'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="activity" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{'Device informati'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Osversion'}</span>
                  <span className="font-medium">{t('macOS142_798')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Browser'}</span>
                  <span className="font-medium">{t('Chrome121_800')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Ipaddress'}</span>
                  <span className="font-medium">192.168.1.100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Status'}</span>
                  <span className="px-2 py-1 rounded-full bg-success/20 text-success text-xs">
                    {'Trusted'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Security status'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{'Risk score'}</span>
                  <span className="px-3 py-1 rounded-full bg-success/20 text-success">{'Low'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Encryption'}</span>
                  <span className="font-medium">{t('AES256_808')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Firewall'}</span>
                  <span className="font-medium">{'Enabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{'Last security sca'}</span>
                  <span className="font-medium">{t('1hourago_812')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="destructive">{'Remove device'}</Button>
            <Button variant="outline">{'Run security scan'}</Button>
          </div>
        </main>
      </div>
    </div>
  );
}
