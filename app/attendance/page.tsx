'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { DashboardService } from '@/lib/services/dashboard';
import { format } from 'date-fns';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { exportAttendanceToExcel } from '@/lib/utils/exportAttendanceExcel';
import { exportReportToPPT } from '@/lib/utils/exportPPT';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { AttendanceReportsTab } from '@/components/system-management/AttendanceReportsTab';
interface AttendanceRow {
  id?: string;
  user_id?: string;
  employee_id?: string;
  company_id?: string | null;
  date?: string;
  check_in?: string | null;
  check_out?: string | null;
  total_hours?: number | null;
  location_in?: string | null;
  location_out?: string | null;
  lat?: number | null;
  lon?: number | null;
  location_valid?: boolean | null;
  status?: string;
  verification_status?: string | null;
  ip_address?: string | null;
  created_at?: string;
  full_name?: string | null;
  email?: string | null;
  department?: string | null;
  role?: string | null;
  users?: { full_name?: string | null; email?: string | null; employee_id?: string | null };
}

export default function Page() {
  const { user } = useAuthStore();
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    try {
      const res = await DashboardService.getAttendance();
      setAttendanceData(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await DashboardService.getAttendance();
        if (!cancelled) setAttendanceData(res || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayRecord = attendanceData.find(a => (a.user_id === user?.id || a.employee_id === user?.id) && a.date === todayStr);

  const handleMarkAttendance = async (type: 'check_in' | 'check_out') => {
    setMarking(true);
    try {
      await DashboardService.markAttendance(type);
      toast.success(`Successfully ${type === 'check_in' ? 'checked in' : 'checked out'}`);
      await load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  const columns = [
    {
      key: 'full_name',
      label: 'Employee Name',
      render: (_: string | null, row: AttendanceRow) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.full_name || row.users?.full_name || 'System User'}</span>
          <span className="text-xs text-gray-500">{row.email || row.users?.email || 'user@company.com'}</span>
        </div>
      )
    },
    {
      key: 'employee_id',
      label: 'Employee ID',
      render: (_: string | null, row: AttendanceRow, index?: number) => (
        <span className="font-mono text-xs text-blue-400 font-semibold">
          {row.employee_id || row.users?.employee_id || row.user_id || `EMP-${1000 + (index || 0) + 1}`}
        </span>
      )
    },
    {
      key: 'date',
      label: 'Date',
      render: (val: string, row: AttendanceRow) => {
        const dateStr = val || row.created_at;
        return dateStr ? format(new Date(dateStr), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      }
    },
    {
      key: 'check_in',
      label: 'Login Time',
      render: (val: string | null) => val ? format(new Date(val), 'hh:mm a') : '—'
    },
    {
      key: 'check_out',
      label: 'Logout Time',
      render: (val: string | null) => val ? format(new Date(val), 'hh:mm a') : '—'
    },
    {
      key: 'location_in',
      label: 'Location',
      render: (_: string | null, row: AttendanceRow) => {
        const loc = row.location_out || row.location_in;
        if (row.lat != null && row.lon != null) {
          return (
            <span className="font-mono text-xs text-gray-300">{`${Number(row.lat).toFixed(4)}, ${Number(row.lon).toFixed(4)}`}</span>
          );
        }
        if (loc) {
          if (loc === 'Remote') return <span className="text-amber-400">Remote</span>;
          return <span className="text-gray-300">{loc}</span>;
        }
        return <span className="text-gray-500">Headquarters</span>;
      }
    },
    {
      key: 'ip_address',
      label: 'Network IP',
      render: (val: string | null) => val ? (
        <span className="font-mono text-xs text-gray-300">{val}</span>
      ) : (
        <span className="text-gray-600">—</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string | null) => {
        const status = val || '';
        const isPresent = ['Present', 'PRESENT', 'SUCCESS', 'ACTIVE'].includes(status);
        const isOnLeave = ['ON_LEAVE', 'On Leave'].includes(status);
        const isFlagged = status === 'Flagged';
        const badgeClass = isPresent
          ? 'bg-green-500/10 text-green-400 border-green-500/20'
          : isOnLeave
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : isFlagged
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20';
        const label = isPresent ? 'Present' : isOnLeave ? 'On Leave' : isFlagged ? 'Flagged' : (status || 'Absent / Denied');
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'total_hours',
      label: 'Total Hours',
      render: (val: number | null, row: AttendanceRow) => {
        if (val != null) return <span className="font-semibold text-gray-300">{val} Hrs</span>;
        const checkIn = row.check_in ? new Date(row.check_in) : null;
        const checkOut = row.check_out ? new Date(row.check_out) : null;
        if (checkIn && checkOut) {
          const diff = ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(1);
          return <span className="font-semibold text-gray-300">{diff} Hrs</span>;
        }
        return <span className="text-gray-600">—</span>;
      }
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
        <Sidebar />
        <div className="lg:ml-64 transition-all duration-300 min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 pt-24 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading attendance records...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-y-auto">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden space-y-12">
          <DataGridPage
            hideLayout={true}
            title="My Attendance Report"
            description="Monitor your daily attendance, check-in timestamps, and user sessions."
            columns={columns}
            data={attendanceData}
            onExportExcel={() => exportAttendanceToExcel(attendanceData)}
            onExportPPT={() => exportReportToPPT(attendanceData, 'Attendance Report')}
            filters={[{ key: 'status', label: 'Status' }]}
            primaryAction={
              !myTodayRecord
                ? { label: marking ? 'Processing...' : 'Check In', icon: LogIn, onClick: () => handleMarkAttendance('check_in') }
                : undefined
            }
            secondaryAction={
              myTodayRecord && !myTodayRecord.check_out
                ? { label: marking ? 'Processing...' : 'Check Out', icon: LogOut, onClick: () => handleMarkAttendance('check_out') }
                : undefined
            }
          />

          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <div className="pt-8 border-t border-white/10">
              <AttendanceReportsTab hideLayout={true} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
