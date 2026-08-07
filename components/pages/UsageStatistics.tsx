'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Activity, TrendingUp, Users, Database } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const stats = [
  { label: 'API Calls', value: '2.4M', icon: Activity, color: 'primary', trend: '+18%' },
  { label: 'Active Users', value: '287', icon: Users, color: 'success', trend: '+12%' },
  { label: 'Storage Used', value: '12.4 TB', icon: Database, color: 'warning', trend: '+5%' },
  { label: 'Bandwidth', value: '890 GB', icon: TrendingUp, color: 'primary', trend: '+22%' },
];

export function UsageStatistics() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Usage statistics'}</h1>
            <p className="text-muted-foreground">{'Trackyourresour'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${stat.color}/20 flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-semibold">{stat.value}</h3>
                    <p className="text-xs text-success mt-1">{stat.trend}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
