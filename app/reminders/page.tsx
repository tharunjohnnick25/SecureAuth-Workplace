'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import {
  BellRing,
  Award,
  CalendarClock,
  AlertTriangle,
  Send,
  Loader2,
  Smartphone,
  Mail,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Plus,
  MessageSquare,
  Hash,
  Settings2,
  BellOff,
  CalendarDays,
  X,
  FileEdit,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, addDays } from 'date-fns';

type Reminder = {
  id: string;
  type: string;
  title: string;
  message: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  action_url: string;
};

type ReminderSummary = {
  certifications: Reminder[];
  shifts: Reminder[];
  missed_deadlines: Reminder[];
  custom: Reminder[];
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const EMPTY_SUMMARY: ReminderSummary = { certifications: [], shifts: [], missed_deadlines: [], custom: [] };

export default function RemindersPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<ReminderSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [rules, setRules] = useState({
    push: true,
    email: true,
    sms: false,
    slack: false,
  });


  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    priority: 'medium',
    due_date: '',
  });
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadReminders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders?user_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) setSummary(data.data || EMPTY_SUMMARY);
    } catch (e) {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    try {
      const stored = localStorage.getItem('reminder-rules');
      if (stored) {
        setRules(JSON.parse(stored));
      }
    } catch {}
  }, [user?.id]);

  const toggleRule = (key: keyof typeof rules) => {
    setRules((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('reminder-rules', JSON.stringify(next));
      return next;
    });
  };

  const sendReminders = async () => {
    if (!user?.id) return;
    setSending(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, channel: rules.push ? 'both' : 'email' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`${data.delivered} reminders processed through workflow rules.`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to trigger rules');
    } finally {
      setSending(false);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setCreating(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create_custom',
          userId: user.id,
          ...newReminder
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Custom reminder created');
        setShowCreateModal(false);
        setNewReminder({ title: '', message: '', priority: 'medium', due_date: '' });
        loadReminders();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create reminder');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (reminderId: string, action: 'snooze' | 'dismiss') => {
    if (!user?.id) return;
    setProcessingId(reminderId);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: user.id,
          reminderId,
          days: action === 'snooze' ? 1 : undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reminder ${action === 'snooze' ? 'snoozed for 1 day' : 'dismissed'}`);
        loadReminders();
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} reminder`);
    } finally {
      setProcessingId(null);
    }
  };

  const total = summary.certifications.length + summary.shifts.length + summary.missed_deadlines.length + summary.custom.length;

  const sections = [
    {
      key: 'certifications' as const,
      label: 'Expiring Certifications',
      icon: Award,
      accent: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      empty: 'No certifications expiring in the next 30 days.',
      reminders: summary.certifications,
    },
    {
      key: 'shifts' as const,
      label: 'Upcoming Shift Changes',
      icon: CalendarClock,
      accent: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      empty: 'No shift changes scheduled in the next 7 days.',
      reminders: summary.shifts,
    },
    {
      key: 'missed_deadlines' as const,
      label: 'Missed Deadlines',
      icon: AlertTriangle,
      accent: 'text-red-400',
      iconBg: 'bg-red-500/10',
      border: 'border-red-500/20',
      empty: 'No missed deadlines.',
      reminders: summary.missed_deadlines,
    },
    {
      key: 'custom' as const,
      label: 'Custom Reminders',
      icon: ClipboardList,
      accent: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      empty: 'No custom active reminders.',
      reminders: summary.custom,
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mt-2 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <BellRing className="w-5 h-5" />
                </div>
                Reminders Hub
              </h1>
              <p className="text-gray-400 text-sm">
                Manage, snooze, and dismiss system alerts, or create your own custom automated reminders.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateModal(true)} variant="outline" className="border-white/10 hover:bg-white/5 flex items-center gap-2 py-3 px-4">
                <Plus className="w-4 h-4" />
                New Reminder
              </Button>
              <Button onClick={sendReminders} disabled={sending} className="bg-blue-600 hover:bg-blue-500 flex items-center gap-2 py-3 px-6">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Trigger Rules
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Automation Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'push', label: 'Push Notifications', desc: 'In-app and browser alerts', icon: Smartphone, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { key: 'email', label: 'Email Alerts', desc: 'Sent to your inbox', icon: Mail, color: 'text-purple-400', bg: 'bg-purple-500/10' },
              ].map((rule) => (
                <div key={rule.key} className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${rule.bg} ${rule.color} flex items-center justify-center`}>
                      <rule.icon className="w-6 h-6" />
                    </div>
                    <Toggle enabled={rules[rule.key as keyof typeof rules]} onChange={() => toggleRule(rule.key as keyof typeof rules)} />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{rule.label}</p>
                  <p className="text-xs text-gray-400">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Active Reminders</h2>
          </div>

          {loading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : total === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 rounded-3xl">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">You're all caught up!</h3>
                <p className="text-gray-400 text-sm max-w-md text-center">There are no active reminders, expiring certifications, or missed deadlines at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {sections.map((section) => {
                  if (section.reminders.length === 0) return null;
                  const Icon = section.icon;
                  return (
                    <div key={section.key} className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">
                      <div className={`flex items-center gap-3 px-6 py-4 border-b ${section.border}`}>
                        <div className={`w-9 h-9 rounded-lg ${section.iconBg} ${section.accent} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-bold text-white">{section.label}</h2>
                        <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full border ${section.reminders.length > 0 ? section.border : 'bg-white/5 text-gray-500 border-white/10'}`}>
                          {section.reminders.length}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.reminders.map((reminder) => (
                            <div key={reminder.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all flex flex-col group">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-sm font-bold text-white">{reminder.title}</h3>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border flex-shrink-0 ${PRIORITY_STYLES[reminder.priority] || PRIORITY_STYLES.low}`}>
                                  {reminder.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{reminder.message}</p>
                              <div className="flex items-center justify-between mt-auto">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(reminder.due_date), { addSuffix: true })}
                                </span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleAction(reminder.id, 'snooze')}
                                    disabled={processingId === reminder.id}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
                                  >
                                    {processingId === reminder.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Snooze'}
                                  </button>
                                  <button 
                                    onClick={() => handleAction(reminder.id, 'dismiss')}
                                    disabled={processingId === reminder.id}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </main>
      </div>

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <FileEdit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">New Reminder</h3>
                <p className="text-xs text-gray-400">Create a custom automated reminder.</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Title</label>
                <input 
                  type="text" 
                  required 
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Message</label>
                <textarea 
                  required 
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none min-h-[80px]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Priority</label>
                  <select 
                    value={newReminder.priority}
                    onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Due Date</label>
                  <input 
                    type="date" 
                    required 
                    value={newReminder.due_date}
                    onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-white/10">
                <Button type="button" variant="outline" className="border-white/10" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-500">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-blue-500' : 'bg-white/10'}`}
      aria-pressed={enabled}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}
