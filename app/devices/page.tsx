'use client';

import { DataGridPage } from '@/components/pages/DataGridPage';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Smartphone, Laptop, Tablet, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from "@/context/LanguageContext";

const FALLBACK_DEVICES = [
  {
    id: 'dev-8f3a2b1c',
    device_name: 'MacBook Pro 14"',
    device_type: 'laptop',
    os: 'macOS 15.5',
    browser: 'Chrome 126',
    is_trusted: true,
    last_used: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'dev-2c7d9e10',
    device_name: 'iPhone 15 Pro',
    device_type: 'mobile',
    os: 'iOS 18.1',
    browser: 'Safari 17',
    is_trusted: true,
    last_used: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'dev-5a9b4c3d',
    device_name: 'Dell XPS 15',
    device_type: 'laptop',
    os: 'Windows 11',
    browser: 'Edge 126',
    is_trusted: false,
    last_used: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'dev-7e1f6g2h',
    device_name: 'iPad Air',
    device_type: 'tablet',
    os: 'iPadOS 18',
    browser: 'Safari 17',
    is_trusted: false,
    last_used: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 'dev-3d5f8a2b',
    device_name: 'Pixel 8 Pro',
    device_type: 'mobile',
    os: 'Android 14',
    browser: 'Chrome 126',
    is_trusted: true,
    last_used: new Date(Date.now() - 604800000).toISOString(),
  },
];

export default function DeviceTrackingPage() {
    const { t } = useLanguage();
  const { data: dbDevices } = useRealtimeData('devices', (q) => 
    q.order('last_active', { ascending: false })
  );

  const devices = useMemo(() => {
    if (dbDevices && dbDevices.length > 0) return dbDevices;
    return FALLBACK_DEVICES;
  }, [dbDevices]);

  const columns = [
    { 
      key: 'device', 
      label: 'Authorized Device',
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {row.device_type === 'mobile' ? <Smartphone className="w-4 h-4" /> : 
             row.device_type === 'tablet' ? <Tablet className="w-4 h-4" /> : 
             <Laptop className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{row.device_name || 'Generic Endpoint'}</p>
            <p className="text-[10px] text-gray-500 font-mono uppercase">{row.id?.substring(0, 8)}</p>
          </div>
        </div>
      )
    },
    { 
      key: 'os', 
      label: 'Platform',
      render: (val: string, row: any) => (
        <span className="text-xs text-gray-400">{val || row.os} / {row.browser}</span>
      )
    },
    { 
      key: 'is_trusted', 
      label: 'Security Status',
      render: (val: boolean) => (
        <div className="flex items-center gap-2">
          {val ? (
            <>
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-400 font-bold uppercase tracking-wider">{'Trusted'}</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">{'Pending'}</span>
            </>
          )}
        </div>
      )
    },
    { 
      key: 'last_used', 
      label: 'Last Pulse',
      render: (_: any, row: any) => {
        const ts = row.last_used || row.last_active;
        return <span className="text-xs text-gray-500">{ts ? new Date(ts).toLocaleString() : 'N/A'}</span>;
      }
    }
  ];

  return (
    <DataGridPage 
      title="Hardware & Device Persistence" 
      description="Track and manage enterprise-authorized devices using unique hardware fingerprinting signatures."
      columns={columns}
      data={devices || []}
    />
  );
}
