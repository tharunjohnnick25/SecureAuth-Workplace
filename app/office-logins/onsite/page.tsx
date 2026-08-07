'use client';

import React, { useEffect, useState } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Loader2, Users } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

export default function OnsiteLoginsPage() {
    const { t } = useLanguage();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: logs } = await supabase
          .from('office_access_logs')
          .select('*, users(full_name, email)')
          .eq('access_type', 'ENTRY')
          .order('timestamp', { ascending: false });
        setData(logs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
       <div className="min-h-screen bg-[#020617] flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
       </div>
    );
  }

  return (
    <DataGridPage 
      title="Active On-Site Staff" 
      description="Detailed list of all employees currently detected at physical office locations."
      columns={[
        { 
          key: 'user', 
          label: 'Employee',
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{row.users?.full_name || 'Unknown'}</span>
                <span className="text-xs text-gray-500">{row.users?.email}</span>
              </div>
            </div>
          )
        },
        { key: 'location', label: 'Office Branch' },
        { 
          key: 'timestamp', 
          label: 'Check-in Time',
          render: (val) => format(new Date(val), 'MMM d, h:mm a')
        },
        { 
          key: 'status', 
          label: 'Verification',
          render: () => (
             <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
               {'Idverified'}</span>
          )
        }
      ]}
      data={data}
    />
  );
}
