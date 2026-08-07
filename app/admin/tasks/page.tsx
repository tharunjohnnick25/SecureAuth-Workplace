'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { Target, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useLanguage } from "@/context/LanguageContext";

export default function AdminTasksPage() {
    const { t } = useLanguage();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'Medium',
    deadline: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, eRes] = await Promise.all([
        fetch('/api/admin/tasks'),
        fetch('/api/admin/employees')
      ]);
      const tJson = await tRes.json();
      const eJson = await eRes.json();
      if(tJson.success) setTasks(tJson.data);
      if(eJson.success) setEmployees(eJson.data);
    } catch(err) {
       console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, assigned_by: user?.id || 'admin-1' })
      });
      const json = await res.json();
      if(json.success) {
        toast.success('Task delegated successfully');
        setNewTask({ title: '', description: '', assigned_to: '', priority: 'Medium', deadline: '' });
        fetchData();
      } else {
        toast.error(json.error);
      }
    } catch(err: any) {
      toast.error(err.message);
    }
  };
  
  const handleApproveTask = async (id: string) => {
    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Approved' })
      });
      const json = await res.json();
      if(json.success) {
        toast.success('Task approved');
        fetchData();
      }
    } catch(err: any) {
      toast.error(err.message);
    }
  };

  const columns = [
    { 
      key: 'title', 
      label: 'Task',
      render: (val: string, row: any) => (
        <div>
          <p className="text-sm font-medium text-white">{val}</p>
          <p className="text-xs text-gray-400 truncate max-w-xs">{row.description}</p>
        </div>
      )
    },
    { 
      key: 'assigned_to', 
      label: 'Assignee',
      render: (val: string) => {
        const emp = employees.find(e => e.id === val);
        return <span className="text-sm">{emp ? emp.full_name : val}</span>;
      }
    },
    { 
      key: 'priority', 
      label: 'Priority',
      render: (val: string) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          val === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          val === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
          'bg-cyan-500/100/10 text-blue-400 border border-blue-500/20'
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: 'progress', 
      label: 'Progress',
      render: (val: number) => (
        <div className="flex items-center gap-2">
           <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-cyan-500/100" style={{ width: `${val}%` }}></div>
           </div>
           <span className="text-xs text-gray-400">{val}%</span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-2">
          {val === 'Approved' ? (
             <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><CheckCircle2 className="w-3 h-3"/> {'Approved'}</span>
          ) : val === 'Completed' ? (
             <Button onClick={() => handleApproveTask(row.id)} className="h-7 text-xs bg-green-600 hover:bg-emerald-500/100">{'Approve'}</Button>
          ) : (
             <span className="text-xs text-gray-400">{val}</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">{'Task delegation'}</h1>
            <p className="text-gray-400">{'Assign, track, and approve'}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
             <Card className="lg:col-span-1 p-6 bg-black/40 backdrop-blur-xl border-white/10">
                <h3 className="text-xl font-bold mb-6">{'Assign new task'}</h3>
                <form onSubmit={handleCreateTask} className="space-y-4">
                   <div>
                     <label className="text-sm font-semibold text-gray-300 mb-2 block">{'Task title'}</label>
                     <Input value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} className="bg-black/50 border-white/10" required />
                   </div>
                   <div>
                     <label className="text-sm font-semibold text-gray-300 mb-2 block">{'Description'}</label>
                     <textarea value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="w-full h-24 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 resize-none" required />
                   </div>
                   <div>
                     <label className="text-sm font-semibold text-gray-300 mb-2 block">{'Assign to'}</label>
                     <select value={newTask.assigned_to} onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})} className="w-full h-10 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500" required>
                       <option value="">{'Select employee'}</option>
                       {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.email})</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-sm font-semibold text-gray-300 mb-2 block">{'Priority'}</label>
                     <select value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})} className="w-full h-10 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                       <option value="Low">{'Low'}</option>
                       <option value="Medium">{'Medium'}</option>
                       <option value="High">{'High'}</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-sm font-semibold text-gray-300 mb-2 block">{'Deadline'}</label>
                     <Input type="date" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} className="bg-black/50 border-white/10" required />
                   </div>
                   <Button type="submit" className="w-full bg-blue-600 hover:bg-cyan-500/100 mt-4">{'Delegate task'}</Button>
                </form>
             </Card>
             
             <div className="lg:col-span-3">
               <DataGridPage 
                  title="All Tasks" 
                  description="Monitor progress across all assigned tasks."
                  columns={columns}
                  data={tasks}
                  loading={loading}
                  onRefresh={fetchData}
                  hideLayout={true}
                />
             </div>
          </div>

        </main>
      </div>
    </div>
  );
}
