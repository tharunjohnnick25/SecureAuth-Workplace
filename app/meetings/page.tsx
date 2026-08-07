'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Video, Calendar, Clock, Plus, Lock, Globe, Users, ShieldAlert, Zap, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function MeetingsDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New meeting form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [type, setType] = useState('Private');
  const [requireFaceAuth, setRequireFaceAuth] = useState(false);
  const [password, setPassword] = useState('');

  // Invite picker
  const [invited, setInvited] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings?user_id=${user?.id}`);
      const data = await res.json();
      if (data.success) setMeetings(data.data);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadMeetings();
  }, [user]);

  const openCreate = () => {
    setTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setStartTime(new Date().toTimeString().slice(0, 5));
    setType('Private');
    setRequireFaceAuth(false);
    setPassword('');
    setInvited([]);
    setQuery('');
    setResults([]);
    setShowCreateModal(true);
  };

  const searchEmployees = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(q.trim())}&limit=8`);
      const data = await res.json();
      setResults(Array.isArray(data.data) ? data.data : []);
    } catch {
      setResults([]);
    }
  };

  const addInvitee = (emp: any) => {
    if (emp.id === user?.id) return;
    setInvited((prev) => (prev.some((x) => x.id === emp.id) ? prev : [...prev, emp]));
    setQuery('');
    setResults([]);
  };

  const removeInvitee = (id: string) => {
    setInvited((prev) => prev.filter((x) => x.id !== id));
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: user?.id,
          title,
          date,
          start_time: startTime,
          end_time: '',
          type,
          password,
          face_auth_required: requireFaceAuth,
          waiting_room: true,
          participants: invited.map((x) => x.id)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Meeting scheduled');
      setShowCreateModal(false);
      loadMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule');
    } finally {
      setCreating(false);
    }
  };

  const startInstantMeeting = async () => {
    setCreating(true);
    try {
      const now = new Date();
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: user?.id,
          title: 'Instant Meeting',
          date: now.toISOString().slice(0, 10),
          start_time: now.toTimeString().slice(0, 5),
          end_time: '',
          type: 'Public',
          password: '',
          face_auth_required: false,
          waiting_room: true,
          participants: [],
          status: 'LIVE'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/meetings/${data.data.id}/pre-join`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start meeting');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mt-6 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                <Video className="w-8 h-8 text-blue-400" /> Secure Meetings
              </h1>
              <p className="text-gray-400 text-sm">Real-time video collaboration, secure for everyone in your organization</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <Button onClick={startInstantMeeting} disabled={creating} className="bg-white/10 hover:bg-blue-600 flex items-center gap-2 py-3 px-6 text-base">
                <Zap className="w-5 h-5" /> Instant Meeting
              </Button>
              <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500 flex items-center gap-2 py-3 px-6 text-base">
                <Plus className="w-5 h-5" /> New Meeting
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : meetings.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No meetings yet. Start an instant meeting or schedule one!</p>
              </div>
            ) : (
              meetings.map(m => (
                <Card key={m.id} className="border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <CardHeader className="pb-3 border-b border-white/10">
                    <CardTitle className="text-lg text-white flex items-start justify-between">
                      <span className="truncate pr-2">{m.title}</span>
                      {m.type === 'Private' ? <Lock className="w-4 h-4 text-orange-400 shrink-0" /> : <Globe className="w-4 h-4 text-green-400 shrink-0" />}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {m.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.start_time}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {m.host_id === user?.id ? 'You are hosting' : `Host: ${m.host_name || m.host_id}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.status === 'LIVE' && (
                          <span className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
                          </span>
                        )}
                        {m.face_auth_required && <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"><ShieldAlert className="w-3 h-3" /> Face ID</span>}
                      </div>
                    </div>
                    {m.status === 'LIVE' && (
                      <p className="text-xs text-gray-500">{m.in_call_count || 1} in the call now</p>
                    )}
                    <Button
                      onClick={() => router.push(`/meetings/${m.id}/pre-join`)}
                      className="w-full bg-white/10 hover:bg-blue-600 text-white transition-all"
                    >
                      {m.host_id === user?.id ? 'Join / Start' : 'Join Meeting'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#0b132b] border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Video className="w-5 h-5 text-blue-400" /> Schedule Meeting</h2>
                <form onSubmit={handleCreateMeeting} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Meeting Title</label>
                    <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Security sync" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Date</label>
                      <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Time</label>
                      <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Meeting Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="Private">Private (Invite only)</option>
                      <option value="Public">Public (Anyone with link)</option>
                      <option value="Department">Department</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Invite Employees</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={query}
                        onChange={e => searchEmployees(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white"
                      />
                    </div>
                    {query.trim() && (
                      <div className="mt-2 bg-black/60 border border-white/10 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        {results.map(emp => (
                          <button key={emp.id} type="button" onClick={() => addInvitee(emp)} className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2 text-sm">
                            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(emp.full_name || emp.email || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate">{emp.full_name || emp.email}</span>
                          </button>
                        ))}
                        {results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No employees found.</p>}
                      </div>
                    )}
                  </div>
                  {invited.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {invited.map(emp => (
                        <span key={emp.id} className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-full">
                          {emp.full_name || emp.email}
                          <button type="button" onClick={() => removeInvitee(emp.id)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 border border-blue-500/20 bg-blue-500/5 rounded-lg">
                    <input type="checkbox" id="faceAuth" checked={requireFaceAuth} onChange={e => setRequireFaceAuth(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                    <label htmlFor="faceAuth" className="text-sm text-white flex-1 cursor-pointer">Require Face Authentication</label>
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-500">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Schedule
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
