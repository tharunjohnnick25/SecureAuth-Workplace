'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  Search,
  Download,
  RefreshCw,
  Calendar,
  Building,
  ChevronDown,
  Clock,
  UserCheck,
  UserX,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  X,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  duration: string;
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
}

function formatTime(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadge(status: string, checkIn: string | null) {
  if (!checkIn) return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">Absent</span>;
  switch (status?.toLowerCase()) {
    case 'present':
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Present</span>;
    case 'late':
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Late</span>;
    case 'absent':
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">Absent</span>;
    default:
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">{status || 'Unknown'}</span>;
  }
}

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const limit = 50;

  // Summary stats
  const presentCount = records.filter(r => r.check_in && r.status?.toLowerCase() === 'present').length;
  const absentCount = records.filter(r => !r.check_in).length;
  const activeCount = records.filter(r => r.check_in && !r.check_out && r.date === new Date().toISOString().split('T')[0]).length;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (department) params.set('department', department);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/admin/attendance?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [search, department, dateFrom, dateTo, page]);

  // Fetch departments for filter
  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          const names = j.data.map((d: any) => d.name).filter(Boolean);
          setDepartments(names);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchRecords(), search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchRecords]);

  const handleExport = () => {
    if (!records.length) return;
    const headers = ['Date', 'Employee', 'Email', 'Department', 'Check In', 'Check Out', 'Duration', 'Status'];
    const rows = records.map(r => [
      r.date,
      r.full_name,
      r.email,
      r.department,
      formatTime(r.check_in),
      formatTime(r.check_out),
      r.duration,
      r.status,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setDateFrom(d.toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setPage(1);
  };

  const hasActiveFilters = search || department || page > 1;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Attendance Reports</h1>
              <p className="text-gray-400 text-sm mt-1">
                Real-time login tracking, check-in/out times, and employee hours
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchRecords()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleExport}
                disabled={!records.length}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Records', value: total, icon: Users, color: 'from-blue-500 to-indigo-600' },
              { label: 'Present Today', value: presentCount, icon: UserCheck, color: 'from-emerald-500 to-teal-600' },
              { label: 'Absent', value: absentCount, icon: UserX, color: 'from-red-500 to-rose-600' },
              { label: 'Currently Active', value: activeCount, icon: CheckCircle2, color: 'from-amber-500 to-orange-600' },
            ].map(card => (
              <div key={card.label} className="bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name, email, or employee ID..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Department Filter */}
              <div className="relative min-w-[180px]">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={department}
                  onChange={e => { setDepartment(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {/* Date From */}
              <div className="relative min-w-[155px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>

              {/* Date To */}
              <div className="relative min-w-[155px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Loading attendance records...</p>
                </div>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Clock className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400 text-base font-medium">No attendance records found</p>
                <p className="text-gray-600 text-sm mt-1">
                  {search || department ? 'Try adjusting your filters' : 'Records will appear here once employees log in'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-5 py-4">Employee</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-4">Department</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-4">Date</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-4">Check In</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-4">Check Out</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-4">Duration</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-white/3 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {record.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{record.full_name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{record.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-300 flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-gray-500" />
                              {record.department || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-300">{formatDate(record.date)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-mono flex items-center gap-1.5 ${record.check_in ? 'text-emerald-400' : 'text-gray-600'}`}>
                              {record.check_in && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {formatTime(record.check_in)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-mono flex items-center gap-1.5 ${record.check_out ? 'text-blue-400' : record.check_in ? 'text-amber-400' : 'text-gray-600'}`}>
                              {record.check_out ? <CheckCircle2 className="w-3.5 h-3.5" /> : record.check_in ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : null}
                              {record.check_out ? formatTime(record.check_out) : record.check_in ? 'Active' : '–'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-300 font-mono">{record.duration}</span>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(record.status, record.check_in)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing {records.length} of {total} records
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 text-xs"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-400 px-2">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / limit)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 text-xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
