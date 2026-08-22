'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { useAuthStore } from '@/store/useAuthStore';
import { Shield, ShieldAlert, Users, Phone, Mail, UserPlus, Link as LinkIcon, Loader2, X, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { LeaveApprovalsTab } from '@/components/admin/LeaveApprovalsTab';
import { AccessRequestsTab } from '@/components/admin/AccessRequestsTab';
import { TeamAnalyticsTab } from '@/components/manager/TeamAnalyticsTab';
import { ShiftScheduleTab } from '@/components/manager/ShiftScheduleTab';

export default function MyTeamPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'leaves' | 'access' | 'analytics' | 'schedule'>('directory');

  // Add existing employee state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTeam();
    }
  }, [user?.id]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employees?manager_id=${user?.id}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch team', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddExistingModal = async () => {
    setIsModalOpen(true);
    setSelectedEmployeeId('');
    try {
      // Fetch all employees in the same domain if possible, else all
      const domain = user?.email?.split('@')[1];
      const url = domain ? `/api/employees?domain=${domain}&limit=1000` : '/api/employees?limit=1000';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        // Filter out those who already report to this manager, and the manager themselves
        setAllEmployees(data.data.filter((e: any) => e.manager_id !== user?.id && e.id !== user?.id));
      }
    } catch (err) {
      toast.error('Failed to load employees');
    }
  };

  const handleAddExisting = async () => {
    if (!selectedEmployeeId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: user?.id })
      });
      if (res.ok) {
        toast.success('Team member added successfully!');
        fetchTeam();
        setIsModalOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to add team member');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'employee',
      label: 'Team Member',
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold uppercase overflow-hidden">
            {row.profile_picture ? (
               <img src={row.profile_picture} alt={row.full_name} className="w-full h-full object-cover" />
            ) : (
               row.full_name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div className="font-semibold text-white">{row.full_name}</div>
            <div className="text-xs text-gray-400">{row.designation || 'Employee'} • {row.department}</div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (_: any, row: any) => (
        <div className="flex flex-col gap-1 text-sm text-gray-300">
          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-500" /> {row.email}</div>
          {row.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-500" /> {row.phone}</div>}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string) => (
        <Badge 
          variant="default"
          className={val === 'Active' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : val === 'On Leave' ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : ''}
        >
          {val || 'Active'}
        </Badge>
      )
    },
    {
      key: 'risk_score',
      label: 'AI Risk Profile',
      render: (val: number) => {
        const score = val || 0;
        let color = 'text-green-400';
        let Icon = Shield;
        if (score > 40) { color = 'text-yellow-400'; Icon = ShieldAlert; }
        if (score > 70) { color = 'text-red-400'; Icon = ShieldAlert; }
        
        return (
          <div className={`flex items-center gap-2 font-mono font-bold ${color}`}>
            <Icon className="w-4 h-4" />
            {score}%
          </div>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-24 overflow-x-hidden">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                My Team
              </h1>
              <p className="text-gray-400 max-w-2xl text-lg">
                Manage your direct reports and pending team approvals.
              </p>
            </div>
          </div>

          <div className="flex gap-6 border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('directory')}
              className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
                activeTab === 'directory' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Team Directory
              {activeTab === 'directory' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
                activeTab === 'leaves' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Leave Requests
              {activeTab === 'leaves' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('access')}
              className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
                activeTab === 'access' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Access Requests
              {activeTab === 'access' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
                activeTab === 'analytics' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Team Analytics
              {activeTab === 'analytics' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
                activeTab === 'schedule' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Shift Schedule
              {activeTab === 'schedule' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          </div>

          {activeTab === 'directory' && (
            <DataGridPage
              title=""
              description=""
              data={employees}
              columns={columns}
              loading={loading}
              hideLayout={true}
              primaryAction={{ 
                label: 'New Employee', 
                icon: UserPlus, 
                onClick: () => router.push('/employees/new') 
              }}
              secondaryAction={{
                label: 'Add Existing',
                icon: LinkIcon,
                onClick: openAddExistingModal
              }}
            />
          )}

          {activeTab === 'leaves' && (
            <LeaveApprovalsTab hideLayout={true} />
          )}

          {activeTab === 'access' && (
            <AccessRequestsTab hideLayout={true} />
          )}

          {activeTab === 'analytics' && (
            <TeamAnalyticsTab employees={employees} />
          )}

          {activeTab === 'schedule' && (
            <ShiftScheduleTab employees={employees} />
          )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add Existing Employee</h3>
                  <p className="text-xs text-gray-400">Assign an employee to your team</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Select Employee</label>
              <select 
                value={selectedEmployeeId} 
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select an employee --</option>
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleAddExisting}
              disabled={!selectedEmployeeId || saving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Add to Team'}
            </button>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
