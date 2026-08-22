'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { User, Activity, Clock, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Mail, Phone, MapPin, Building, Target } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

export default function Employee360Page() {
    const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(params.id) {
       fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, tRes, attRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/tasks'),
        fetch(`/api/employee/attendance?userId=${params.id}`)
      ]);
      const empJson = await empRes.json();
      const tJson = await tRes.json();
      const attJson = await attRes.json();
      
      if(empJson.success) setEmployee(empJson.data.find((e:any) => e.id === params.id));
      if(tJson.success) setTasks(tJson.data.filter((t:any) => t.assigned_to === params.id));
      if(attJson.success) setAttendance(attJson.data);
    } catch(err) {
       console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if(!loading && !employee) {
     return (
       <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center flex-col">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold">{'Employee not found'}</h1>
          <Button onClick={() => router.push('/admin/employees')} className="mt-4 bg-white/10 hover:bg-white/20">{'Back to directory'}</Button>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 cursor-pointer hover:text-white" onClick={() => router.push('/admin/employees')}>
                {'Back to directory'}</div>
              <h1 className="text-3xl font-bold mb-1 tracking-tight">{'360° Employee View'}</h1>
              <p className="text-gray-400">{'Comprehensive overview'}</p>
            </div>
          </div>
          
          {loading ? (
             <div className="flex justify-center py-20"><Activity className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Left Column: Profile Card */}
               <Card className="lg:col-span-1 p-8 bg-black/40 backdrop-blur-xl border-white/10 flex flex-col h-fit">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                    {employee.full_name ? employee.full_name.charAt(0).toUpperCase() : <User />}
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-1">{employee.full_name || 'N/A'}</h2>
                  <p className="text-sm text-gray-400 text-center mb-6">{employee.designation || 'Employee'} • {employee.department || 'N/A'}</p>
                  
                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <Mail className="w-4 h-4 text-gray-400"/> {employee.email}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <Phone className="w-4 h-4 text-gray-400"/> {employee.phone || 'No phone number'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-400"/> {employee.address || 'No address provided'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      <Building className="w-4 h-4 text-gray-400"/> {'Joined'}{employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  
                  <Button className="w-full mt-8 bg-blue-600 hover:bg-cyan-500/100">{'Edit profile'}</Button>
               </Card>
               
               {/* Right Column: Widgets */}
               <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
                       <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-blue-400"/> {'Task performance'}</h3>
                       <div className="flex items-center justify-between mb-4">
                         <div className="text-center">
                            <p className="text-3xl font-bold text-white">{tasks.length}</p>
                            <p className="text-xs text-gray-400">{'Total assigned'}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-3xl font-bold text-green-400">{tasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length}</p>
                            <p className="text-xs text-gray-400">{'Completed'}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-3xl font-bold text-yellow-400">{tasks.filter(t => t.status !== 'Completed' && t.status !== 'Approved').length}</p>
                            <p className="text-xs text-gray-400">{'Pending'}</p>
                         </div>
                       </div>
                       <div className="space-y-2 mt-6">
                         {tasks.slice(0,3).map(t => (
                           <div key={t.id} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded-lg">
                             <span className="truncate pr-4">{t.title}</span>
                             <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.status === 'Approved' ? 'bg-emerald-500/100/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.status}</span>
                           </div>
                         ))}
                       </div>
                     </Card>
                     
                     <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
                       <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-purple-400"/> {'Attendance (Last 7 days)'}</h3>
                       <div className="space-y-3">
                         {attendance.slice(0,5).map(a => (
                            <div key={a.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                               <span className="text-gray-300">{new Date(a.date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</span>
                               <span className="text-green-400 font-medium">{'Present'}</span>
                               <span className="text-gray-400 text-xs">{new Date(a.check_in).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                         ))}
                         {attendance.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{'No recent attendance'}</p>}
                       </div>
                     </Card>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
