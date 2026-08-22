'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Plus, GripVertical, Clock, Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { EmployeeService } from '@/lib/services/employees';
import { Employee } from '@/types/employees';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee: string;
  assigned_to?: string;
  assignee_name?: string;
  created_by?: string;
  assigned_by?: string;
  assigner_name?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
}

const STATUS_COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'bg-slate-800 border-slate-700' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-900/40 border-blue-800' },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-900/40 border-emerald-800' },
];

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'>('MEDIUM');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  
  // Employees for assignment
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
      if (user?.role?.toUpperCase() === 'MANAGER') {
        fetchEmployees();
      }
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const res = await EmployeeService.getEmployees({
        department: user?.department,
        status: 'Active',
      });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees for assignment', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const url = `/api/workspace/tasks?assignee=${user?.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const assigneeId = newTaskAssignee || user?.id || '';
      const selectedEmployee = employees.find(e => e.id === assigneeId);
      const assigneeName = selectedEmployee ? selectedEmployee.full_name : user?.full_name || 'Self';

      const res = await fetch('/api/workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          status: 'TODO',
          assignee: assigneeId,
          assignee_name: assigneeName,
          created_by: user?.id,
          priority: newTaskPriority,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks([...tasks, data.task]);
        setIsModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskAssignee('');
        toast.success('Task created');
      }
    } catch (err) {
      toast.error('Error creating task');
    }
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Listening... Speak into your microphone.');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setNewTaskDescription(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice input stopped or error occurred.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleStatusChange = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic UI update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await fetch('/api/workspace/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
    } catch (err) {
      toast.error('Failed to update task');
      fetchTasks(); // revert on failure
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/workspace/tasks?id=${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      toast.error('Error deleting task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'MEDIUM': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const getTaskColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-blue-950/80 border-blue-500/50 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
      case 'IN_PROGRESS': return 'bg-orange-950/80 border-orange-500/50 hover:border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
      case 'DONE': return 'bg-emerald-950/80 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      default: return 'bg-slate-900 border-slate-700 hover:border-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">My Tasks</h1>
              <p className="text-slate-400">Manage your daily work and projects (Workspace).</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {STATUS_COLUMNS.map(col => (
              <div 
                key={col.id}
                className={`rounded-xl border ${col.color} p-4 flex flex-col gap-4 min-h-[500px] transition-colors`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedTaskId) {
                    handleStatusChange(draggedTaskId, col.id as any);
                    setDraggedTaskId(null);
                  }
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="font-semibold text-white">{col.label}</h3>
                  <span className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">
                    {tasks.filter(t => t.status === col.id).length}
                  </span>
                </div>

                {loading ? (
                  <div className="animate-pulse flex flex-col gap-3">
                    <div className="h-24 bg-white/5 rounded-lg border border-white/5"></div>
                    <div className="h-24 bg-white/5 rounded-lg border border-white/5"></div>
                  </div>
                ) : (
                  tasks.filter(t => t.status === col.id).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className={`${getTaskColor(task.status)} border p-4 rounded-xl cursor-grab active:cursor-grabbing transition-colors group relative shadow-lg shadow-black/20`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {(() => {
                          const isAssignee = task.assignee === user?.id || task.assigned_to === user?.id;
                          const isSelfAssigned = isAssignee && (task.created_by === user?.id || task.assigned_by === user?.id);
                          
                          if (isSelfAssigned) {
                            return null;
                          }
                          
                          if (isAssignee) {
                            return (
                              <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800 ml-2">
                                Assigned from: {task.assigner_name || 'Manager'}
                              </span>
                            );
                          }
                          
                          return (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 ml-2">
                              Assigned to: {task.assignee_name || 'Team Member'}
                            </span>
                          );
                        })()}
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                      </div>
                      
                      <h4 className="text-sm font-medium text-white mb-2 leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800">
                        <div className="flex items-center text-xs text-slate-500 gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.created_at).toLocaleDateString()}
                        </div>
                        <GripVertical className="w-4 h-4 text-slate-600 opacity-50 cursor-grab" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>

        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="E.g. Review Q3 security logs"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-300">Description</label>
                  <button 
                    type="button" 
                    onClick={toggleVoiceInput}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                      isListening ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3 h-3 animate-pulse" /> : <Mic className="w-3 h-3" />}
                    {isListening ? 'Stop' : 'Dictate'}
                  </button>
                </div>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full h-24 resize-none bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Add details, updates, or voice notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                </select>
              </div>
              
              {user?.role?.toUpperCase() === 'MANAGER' && employees.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Assign To</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value={user?.id}>Me (Self-assign)</option>
                    {employees.map(emp => (
                      emp.id !== user?.id && (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      )
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
