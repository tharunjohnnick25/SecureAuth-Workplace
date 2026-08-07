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
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const EMPTY_SUMMARY: ReminderSummary = { certifications: [], shifts: [], missed_deadlines: [] };

export default function RemindersPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<ReminderSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [lastSent, setLastSent] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('reminder-preferences');
      if (stored) {
        const prefs = JSON.parse(stored);
        setPushEnabled(prefs.push !== false);
        setEmailEnabled(prefs.email !== false);
      }
    } catch {}
  }, []);

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
  }, [user?.id]);

  const savePreferences = (push: boolean, email: boolean) => {
    try {
      localStorage.setItem('reminder-preferences', JSON.stringify({ push, email }));
    } catch {}
  };

  const togglePush = () => {
    setPushEnabled((prev) => {
      savePreferences(!prev, emailEnabled);
      return !prev;
    });
  };

  const toggleEmail = () => {
    setEmailEnabled((prev) => {
      savePreferences(pushEnabled, !prev);
      return !prev;
    });
  };

  const sendReminders = async () => {
    if (!user?.id) return;
    const channel = pushEnabled && emailEnabled ? 'both' : emailEnabled ? 'email' : 'push';
    setSending(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, channel }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setLastSent(new Date().toISOString());
      toast.success(
        `${data.delivered} reminder${data.delivered === 1 ? '' : 's'} sent via ${channel === 'both' ? 'push + email' : channel}`
      );
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  const total = summary.certifications.length + summary.shifts.length + summary.missed_deadlines.length;

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
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mt-2 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <BellRing className="w-5 h-5" />
                </div>
                Automated Reminders
              </h1>
              <p className="text-gray-400 text-sm">
                Push notifications and email alerts for expiring certifications, upcoming shift changes, and missed deadlines.
              </p>
            </div>
            <Button onClick={sendReminders} disabled={sending || total === 0 || (!pushEnabled && !emailEnabled)} className="bg-blue-600 hover:bg-blue-500 flex items-center gap-2 py-3 px-6">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Reminders Now
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Push Notifications</p>
                  <p className="text-xs text-gray-400">In-app and browser alerts</p>
                </div>
                <Toggle enabled={pushEnabled} onChange={togglePush} />
              </div>
            </div>
            <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Email Alerts</p>
                  <p className="text-xs text-gray-400">Sent to {user?.email || 'your inbox'}</p>
                </div>
                <Toggle enabled={emailEnabled} onChange={toggleEmail} />
              </div>
            </div>
            <div className="bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <BellRing className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{total}</p>
                  <p className="text-xs text-gray-400">Active reminders</p>
                  {lastSent && (
                    <p className="text-[10px] text-gray-500 mt-1">Last sent {formatDistanceToNow(new Date(lastSent), { addSuffix: true })}</p>
                  )}
                </div>
              </div>
              {!pushEnabled && !emailEnabled && (
                <p className="text-[11px] text-amber-400 mt-3">Enable at least one channel to send reminders.</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sections.map((section) => {
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
                      {section.reminders.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-gray-500 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400/70" />
                          {section.empty}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.reminders.map((reminder) => (
                            <div key={reminder.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-colors">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-sm font-bold text-white">{reminder.title}</h3>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border flex-shrink-0 ${PRIORITY_STYLES[reminder.priority] || PRIORITY_STYLES.low}`}>
                                  {reminder.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed mb-3">{reminder.message}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {reminder.type === 'CERTIFICATION'
                                    ? `Expires ${formatDistanceToNow(new Date(reminder.due_date), { addSuffix: true })}`
                                    : formatDistanceToNow(new Date(reminder.due_date), { addSuffix: true })}
                                </span>
                                <a href={reminder.action_url} className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline">
                                  View
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-400">
            <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p>
              Delivered reminders appear in your <a href="/notifications" className="text-blue-400 hover:underline">Notifications</a> center.
              In this demo the delivery is simulated; a production deployment would send via the push provider or email gateway you configure.
            </p>
          </div>
        </main>
      </div>
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
