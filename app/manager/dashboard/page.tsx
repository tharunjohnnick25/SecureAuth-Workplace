'use client';

import { Card } from '@/components/Card';
import { Users, FileCheck, ShieldAlert, Activity, CheckCircle2, Clock, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

export default function ManagerDashboardPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchEmployees();
      fetchTasks();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/employees?manager_id=${user?.id}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/workspace/tasks?assigned_by=${user?.id}`); // Fetch tasks created by the manager
      const json = await res.json();
      setTasks(json.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigned_to) {
      toast.error('Title and Assignee are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          status: 'TODO',
          assignee: newTask.assigned_to,
          assignee_name: employees.find(e => e.id === newTask.assigned_to)?.full_name || 'Employee',
          created_by: user?.id,
          priority: 'MEDIUM'
        })
      });

      if (res.ok) {
        toast.success('Task assigned successfully');
        setNewTask({ title: '', description: '', assigned_to: '' });
        fetchTasks();
      } else {
        const errorData = await res.json();
        toast.error(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`An error occurred: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-24 overflow-x-hidden">
          {/* Dashboard Content */}
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{user?.department} Manager Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor your team's activity and pending approvals.</p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Active</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{employees.length || 12}</h3>
            <p className="text-sm text-gray-500">Direct Reports</p>
          </Card>

          <Card className="p-6 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{tasks.length}</h3>
            <p className="text-sm text-gray-500">Active Tasks</p>
          </Card>

          <Card className="p-6 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <FileCheck className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20">Action Required</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">3</h3>
            <p className="text-sm text-gray-500">Pending Leave Requests</p>
          </Card>

          <Card className="p-6 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">100%</h3>
            <p className="text-sm text-gray-500">Compliance & Training</p>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Task Assignment */}
          <Card className="p-6 border-white/5">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              Assign New Task
            </h3>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Employee</label>
                <select 
                  className="w-full bg-[#0a0a16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                  required
                >
                  <option value="">Select Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Task Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Q3 Sales Report"
                  className="w-full bg-[#0a0a16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Details about the task..."
                  className="w-full bg-[#0a0a16] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || !newTask.assigned_to}
                className="w-full py-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Task'}
              </button>
            </form>
          </Card>

          {/* Assigned Tasks Tracking */}
          <Card className="p-6 border-white/5">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Active Assigned Tasks
            </h3>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No active tasks assigned yet.</p>
              ) : (
                tasks.map((task, i) => (
                  <div key={i} className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-white">{task.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        task.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {task.status === 'DONE' ? 'Completed' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Assigned to: <strong className="text-gray-300">{task.assignee_name}</strong></span>
                      <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
          </div>
        </main>
      </div>
    </div>
  );
}
