'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Calendar, Clock, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from '@/store/useAuthStore';

export default function LeaveRequestPage() {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [form, setForm] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const leaveBalances = [
    { type: 'Annual Leave', total: 20, used: 5 },
    { type: 'Sick Leave', total: 10, used: 2 },
    { type: 'Casual Leave', total: 5, used: 0 },
  ];

  const fetchLeaves = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/leaves?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.full_name || user.email,
          type: form.type,
          start_date: form.startDate,
          end_date: form.endDate,
          reason: form.reason
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Leave request submitted successfully. Awaiting approval.');
        setForm({ type: 'Annual Leave', startDate: '', endDate: '', reason: '' });
        fetchLeaves(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to submit leave');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error submitting leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{'Leave management' || 'Leave Management'}</h1>
            <p className="text-gray-400">{'Requesttimeoffa' || 'Request time off and track your balances.'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Request Form */}
              <Card className="glass-panel p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" /> {'New leave request' || 'New Leave Request'}
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2">{'Leave type' || 'Leave Type'}</label>
                      <select 
                        value={form.type} 
                        onChange={e => setForm({...form, type: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="Annual Leave">{'Annual leave' || 'Annual Leave'}</option>
                        <option value="Sick Leave">{'Sick leave' || 'Sick Leave'}</option>
                        <option value="Casual Leave">{'Casual leave' || 'Casual Leave'}</option>
                        <option value="Unpaid Leave">{'Unpaid leave' || 'Unpaid Leave'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2">{'Start date' || 'Start Date'}</label>
                      <input 
                        type="date" 
                        value={form.startDate}
                        onChange={e => setForm({...form, startDate: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2">{'End date' || 'End Date'}</label>
                      <input 
                        type="date" 
                        value={form.endDate}
                        onChange={e => setForm({...form, endDate: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-2">{'Reason optional' || 'Reason (Optional)'}</label>
                      <textarea 
                        value={form.reason}
                        onChange={e => setForm({...form, reason: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
                        placeholder="Briefly describe your reason for leave..."
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20">
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> Submitting...</> : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Leave History */}
              <Card className="glass-panel p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" /> {'Recent requests' || 'Recent Requests'}
                  </CardTitle>
                </CardHeader>
                <div className="space-y-3">
                  {fetching ? (
                    <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
                  ) : leaves.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No leave requests found.</div>
                  ) : leaves.map(leave => (
                    <div key={leave.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{leave.type}</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {leave.start_date} {'To' || 'to'} {leave.end_date}
                        </p>
                        {leave.reason && <p className="text-xs text-gray-500 mt-1 italic">"{leave.reason}"</p>}
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                        leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        leave.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {/* Leave Balances */}
              <Card className="glass-panel p-6 sticky top-24">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" /> {'Balances' || 'Balances'}
                  </CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  {leaveBalances.map(balance => (
                    <div key={balance.type} className="p-4 rounded-xl border border-white/10 bg-black/40">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-300">{balance.type}</span>
                        <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded">{balance.total - balance.used} {'Left' || 'left'}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
                        <div 
                          className="h-full bg-cyan-500 rounded-full" 
                          style={{ width: `${(balance.used / balance.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-bold uppercase">
                        <span>{'Used' || 'Used: '}{balance.used}</span>
                        <span>{'Total' || 'Total: '}{balance.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200 leading-relaxed">
                    {'Leaverequestsmu' || 'Leave requests must be submitted at least 2 days in advance for non-emergencies.'}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
