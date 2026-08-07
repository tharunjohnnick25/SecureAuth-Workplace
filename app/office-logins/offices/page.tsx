'use client';

import React, { useEffect, useState } from 'react';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { supabase } from '@/lib/supabase';
import { Loader2, Building2, ShieldCheck } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

export default function OfficesPage() {
    const { t } = useLanguage();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: offices } = await supabase
          .from('organizations') // Using organizations table as offices
          .select('*');
        setData(offices || []);
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
      title="Monitored Office Locations" 
      description="List of physical corporate buildings and their current security status."
      columns={[
        { 
          key: 'name', 
          label: 'Office Name',
          render: (val) => (
             <div className="flex items-center gap-3">
               <Building2 className="w-4 h-4 text-blue-400" />
               <span className="font-semibold">{val}</span>
             </div>
          )
        },
        { key: 'industry', label: 'Region/Zone' }, // Mapping industry to region for demo
        { 
          key: 'status', 
          label: 'Security Status',
          render: () => (
            <div className="flex items-center gap-2 text-emerald-400">
               <ShieldCheck className="w-3 h-3" />
               <span className="text-[10px] font-bold uppercase">{'Hardened'}</span>
            </div>
          )
        },
        { 
          key: 'created_at', 
          label: 'Online Since',
          render: (val) => new Date(val).toLocaleDateString()
        }
      ]}
      data={data}
    />
  );
}
