'use client';

import { DataGridPage } from '@/components/pages/DataGridPage';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Smartphone, Laptop, Tablet, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from "@/context/LanguageContext";

export function DeviceFingerprintingTab() {
  const { t } = useLanguage();
  const { data: dbDevices } = useRealtimeData('devices', (q) => 
    q.order('last_active', { ascending: false })
  );

  const devices = useMemo(() => {
    return dbDevices || [];
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
      hideLayout={true}
      hideSearch={true}
    />
  );
}
