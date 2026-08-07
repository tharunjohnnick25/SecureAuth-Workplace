'use client';

import React, { useEffect, useState } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Loader2, Globe } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

export default function RemoteLoginsPage() {
    const { t } = useLanguage();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: logs } = await supabase
          .from('login_logs')
          .select('*, users(full_name, email)')
          .eq('is_remote', true)
          .order('created_at', { ascending: false });
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
      title="Remote Access History" 
      description="Monitor all authenticated sessions originating from outside corporate physical perimeters."
      columns={[
        { 
          key: 'user', 
          label: 'Employee',
          render: (_, row) => (
            <div className="flex flex-col">
              <span className="font-medium">{row.users?.full_name || 'Remote User'}</span>
              <span className="text-xs text-gray-500">{row.users?.email}</span>
            </div>
          )
        },
        { 
          key: 'location', 
          label: 'IP Location',
          render: (val) => val ? `${val.city || 'Unknown'}, ${val.country || 'XX'}` : 'Unknown'
        },
        { 
          key: 'ip_address', 
          label: 'IP Address',
          render: (val) => <span className="font-mono text-xs">{val}</span>
        },
        { 
          key: 'created_at', 
          label: 'Login Time',
          render: (val) => format(new Date(val), 'MMM d, h:mm a')
        },
        { 
          key: 'risk_score', 
          label: 'Risk',
          render: (val) => (
             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
               (val || 0) > 60 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
             }`}>
               {val || 0} {'Score'}</span>
          )
        }
      ]}
      data={data}
    />
  );
}
