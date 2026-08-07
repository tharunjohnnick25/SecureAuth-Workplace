'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Loader2, Moon, BellOff, Plus, Trash2, Clock, ShieldAlert } from 'lucide-react';
import { FocusBlock, FocusSettings, isNowInBlock, nowInTime } from '@/lib/focus-utils';

const DAY_LABELS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const emptySettings: FocusSettings = {
  enabled: true,
  timezone: '',
  blocks: [],
  allow_critical: true,
};

function newBlock(): FocusBlock {
  return {
    id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5],
  };
}

function blockContainsNow(block: FocusBlock | undefined, minutes: number, weekday: number): boolean {
  if (!block) return false;
  const days = Array.isArray(block.days) ? block.days : [];
  if (days.length > 0 && !days.includes(weekday)) return false;
  const toMin = (v: string) => {
    const [h, m] = String(v).split(':').map(Number);
    return Number(h) * 60 + Number(m || 0);
  };
  const s = toMin(block.start);
  const e = toMin(block.end);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

export function FocusMode() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<FocusSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/focus-mode?user_id=${user?.id || ''}`);
        const data = await res.json();
        if (data.success && data.data && !cancelled) {
          setSettings({
            enabled: data.data.enabled !== false,
            timezone: data.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            blocks: Array.isArray(data.data.blocks) ? data.data.blocks : [],
            allow_critical: data.data.allow_critical !== false,
          });
        }
      } catch {
        if (!cancelled) toast.error('Failed to load focus mode settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tz = settings.timezone || 'UTC';
  const active = settings.enabled && isNowInBlock(settings.blocks, tz, now);
  const { minutes: nowMinutes, weekday: nowWeekday } = nowInTime(tz, now);
  const activeBlock = (settings.blocks || []).find((b) => blockContainsNow(b, nowMinutes, nowWeekday));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/focus-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          enabled: settings.enabled,
          timezone: tz,
          blocks: settings.blocks,
          allow_critical: settings.allow_critical,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings({
          enabled: data.data.enabled !== false,
          timezone: data.data.timezone || tz,
          blocks: Array.isArray(data.data.blocks) ? data.data.blocks : [],
          allow_critical: data.data.allow_critical !== false,
        });
        toast.success('Focus mode settings saved');
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (id: string, patch: Partial<FocusBlock>) => {
    setSettings((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const removeBlock = (id: string) => {
    setSettings((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));
  };

  const addBlock = () => {
    setSettings((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock()] }));
  };

  const toggleDay = (id: string, day: number) => {
    setSettings((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== id) return b;
        const days = Array.isArray(b.days) ? b.days : [];
        return {
          ...b,
          days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
        };
      }),
    }));
  };

  const inputCls =
    'w-full bg-[#1a2133] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all';

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Moon className="w-5 h-5" />
                </div>
                Focus Mode &amp; Time-Blocking
              </h1>
              <p className="text-gray-400 text-sm">
                Lock out team notifications during your deep-work blocks so nothing interrupts you.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-32">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Status banner */}
              <div
                className={`rounded-2xl border p-6 shadow-xl flex items-center gap-4 ${
                  active
                    ? 'bg-green-500/10 border-green-500/30'
                    : settings.enabled && settings.blocks.length > 0
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    active
                      ? 'bg-green-500/20 text-green-400'
                      : settings.enabled
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {active ? <BellOff className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {active
                      ? `In Focus Mode — notifications locked out until ${activeBlock?.end || 'the block ends'}`
                      : settings.enabled && settings.blocks.length > 0
                      ? 'Focus blocks scheduled'
                      : 'Focus mode is off'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {active
                      ? 'Team notifications addressed to you are being suppressed server-side. Critical & security alerts are delivered unless you disable them below.'
                      : settings.enabled && settings.blocks.length > 0
                      ? 'You are outside an active block. Non-critical team notifications are flowing normally.'
                      : 'Enable focus mode and add time blocks to silence team notifications during deep work.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Preferences */}
                <div className="lg:col-span-2 bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-blue-400" /> Preferences
                  </h3>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div>
                        <p className="font-semibold text-sm">Focus Mode</p>
                        <p className="text-xs text-gray-400">Suppress team notifications during blocks</p>
                      </div>
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={(v) => setSettings((prev) => ({ ...prev, enabled: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-400" /> Allow critical &amp; security alerts
                        </p>
                        <p className="text-xs text-gray-400">
                          CRITICAL and SECURITY alerts still get through during focus
                        </p>
                      </div>
                      <Switch
                        checked={settings.allow_critical}
                        onCheckedChange={(v) => setSettings((prev) => ({ ...prev, allow_critical: v }))}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                        Time Zone
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                        className={inputCls}
                      >
                        {TIMEZONES.map((tzName) => (
                          <option key={tzName} value={tzName}>
                            {tzName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Time blocks */}
                <div className="lg:col-span-3 bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" /> Time Blocks
                    </h3>
                    <Button size="sm" variant="outline" onClick={addBlock} className="gap-2">
                      <Plus className="w-4 h-4" /> Add Block
                    </Button>
                  </div>

                  {settings.blocks.length === 0 ? (
                    <div className="text-center py-14 text-gray-500">
                      <BellOff className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No time blocks yet. Add a block to start locking out notifications.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {settings.blocks.map((block) => (
                        <div key={block.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                                Start
                              </label>
                              <input
                                type="time"
                                value={block.start}
                                onChange={(e) => updateBlock(block.id, { start: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                                End
                              </label>
                              <input
                                type="time"
                                value={block.end}
                                onChange={(e) => updateBlock(block.id, { end: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                              Days
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {DAY_LABELS.map((day) => {
                                const selected = (block.days || []).includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDay(block.id, day.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                      selected
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBlock(block.id)}
                              className="text-red-400 hover:text-red-300 gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
