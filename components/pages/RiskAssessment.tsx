'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Shield, Target, AlertTriangle, CheckCircle, Activity, Globe, Smartphone, Lock } from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useLanguage } from "@/context/LanguageContext";

export function RiskAssessment() {
    const { t } = useLanguage();
  const { data: logins } = useRealtimeData('login_history');
  
  const riskMetrics = useMemo(() => {
    const total = (logins as any[]).length || 1;
    const avgScore = (logins as any[]).reduce((acc, l: any) => acc + (l.risk_score || 0), 0) / total;
    const highRisk = (logins as any[]).filter((l: any) => (l.risk_score || 0) > 70).length;
    const mediumRisk = (logins as any[]).filter((l: any) => (l.risk_score || 0) > 30 && (l.risk_score || 0) <= 70).length;

    // Data for radar chart
    const radarData = [
      { subject: 'Geo Velocity', A: (logins as any[]).filter((l: any) => l.risk_score > 80 && l.type === 'geo').length * 10, fullMark: 100 },
      { subject: 'Device Trust', A: (logins as any[]).filter((l: any) => l.risk_score > 60 && l.type === 'device').length * 10, fullMark: 100 },
      { subject: 'Typing Biometrics', A: 45, fullMark: 100 }, // Mocked for now as we don't store typing raw in history
      { subject: 'Impossible Travel', A: (logins as any[]).filter((l: any) => l.risk_score === 100).length * 20, fullMark: 100 },
      { subject: 'IP Reputation', A: 30, fullMark: 100 },
    ];

    return { avgScore, highRisk, mediumRisk, radarData };
  }, [logins]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Advanced risk ass'}</h1>
            <p className="text-muted-foreground">{'Automatedbehavi'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
             <Card className="bg-primary/5 border-primary/20">
               <CardContent className="pt-6">
                 <div className="flex flex-col items-center">
                    <Target className="w-10 h-10 text-primary mb-2" />
                    <h3 className="text-3xl font-bold">{Math.round(riskMetrics.avgScore)}</h3>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">{'Network avg score'}</p>
                 </div>
               </CardContent>
             </Card>
             
             <Card className="bg-destructive/5 border-destructive/20">
               <CardContent className="pt-6">
                 <div className="flex flex-col items-center">
                    <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
                    <h3 className="text-3xl font-bold">{riskMetrics.highRisk}</h3>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">{'High risk events'}</p>
                 </div>
               </CardContent>
             </Card>

             <Card className="bg-warning/5 border-warning/20">
               <CardContent className="pt-6">
                 <div className="flex flex-col items-center">
                    <Activity className="w-10 h-10 text-warning mb-2" />
                    <h3 className="text-3xl font-bold">{riskMetrics.mediumRisk}</h3>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">{'Anomalous signal'}</p>
                 </div>
               </CardContent>
             </Card>

             <Card className="bg-success/5 border-success/20">
               <CardContent className="pt-6">
                 <div className="flex flex-col items-center">
                    <CheckCircle className="w-10 h-10 text-success mb-2" />
                    <h3 className="text-3xl font-bold">99.8%</h3>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">{'Signal accuracy'}</p>
                 </div>
               </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="h-[500px]">
              <CardHeader>
                <CardTitle>{'Risk multi vector'}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskMetrics.radarData}>
                    <PolarGrid stroke="rgba(99, 102, 241, 0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" />
                    <Radar
                      name="Risk Level"
                      dataKey="A"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="h-[500px]">
              <CardHeader>
                <CardTitle>{'Active security p'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                   <div className="p-4 rounded-xl bg-input-background/50 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <Globe className="w-6 h-6 text-primary" />
                         <div>
                           <p className="font-semibold">{'Impossible trave'}</p>
                           <p className="text-xs text-muted-foreground">{'Enabledvia geogr'}</p>
                         </div>
                      </div>
                      <div className="px-3 py-1 bg-success/20 text-success text-xs font-bold rounded-full">{'Active'}</div>
                   </div>

                   <div className="p-4 rounded-xl bg-input-background/50 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <Smartphone className="w-6 h-6 text-primary" />
                         <div>
                           <p className="font-semibold">{'Device fingerpri'}</p>
                           <p className="text-xs text-muted-foreground">{'Canvas web glosve'}</p>
                         </div>
                      </div>
                      <div className="px-3 py-1 bg-success/20 text-success text-xs font-bold rounded-full">{'Active'}</div>
                   </div>

                   <div className="p-4 rounded-xl bg-input-background/50 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <Lock className="w-6 h-6 text-primary" />
                         <div>
                           <p className="font-semibold">{'Adaptive biometr'}</p>
                           <p className="text-xs text-muted-foreground">{'Automaticchalle'}</p>
                         </div>
                      </div>
                      <div className="px-3 py-1 bg-success/20 text-success text-xs font-bold rounded-full">{'Active'}</div>
                   </div>

                   <div className="mt-8 p-6 bg-primary/10 rounded-2xl border border-primary/20 text-center">
                      <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
                      <h4 className="text-lg font-bold mb-1">{'Autonomous prote'}</h4>
                      <p className="text-sm text-muted-foreground">{'Yournetworkrisk'}</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
