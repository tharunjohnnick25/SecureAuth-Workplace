'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { DepartmentService } from '@/lib/services/departments';
import { EmployeeService } from '@/lib/services/employees';
import { Department, DepartmentAnalytics } from '@/types/departments';
import { Employee } from '@/types/employees';
import { Loader2, Plus, Building2, X, AlertCircle, Edit, Trash2, Users, BarChart3, PieChart, TrendingUp, ChevronDown, RotateCw, Save, Eye, Search, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [analytics, setAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [headId, setHeadId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, emps] = await Promise.all([
        DepartmentService.getDepartments(),
        EmployeeService.getActiveEmployees(),
      ]);
      setDepartments(depts);
      setActiveEmployees(emps);
    } catch (e: any) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await DepartmentService.getDepartmentAnalytics();
      setAnalytics(data);
    } catch { /* ignore */ } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); fetchAnalytics(); }, [fetchData, fetchAnalytics]);

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditMode(dept.id);
      setName(dept.name);
      setDescription(dept.description || '');
      setHeadId(dept.head_id || '');
    } else {
      setEditMode(null);
      setName('');
      setDescription('');
      setHeadId('');
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditMode(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Department name must be at least 2 characters');
      return;
    }
    setSubmitting(true);
    try {
      if (editMode) {
        await DepartmentService.updateDepartment(editMode, { name: trimmedName, description, head: headId || undefined });
        toast.success('Department updated');
      } else {
        const isDuplicate = departments.some(d => d.name?.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
          setError(`Department "${trimmedName}" already exists`);
          setSubmitting(false);
          return;
        }
        await DepartmentService.createDepartment({ name: trimmedName, description, head: headId || undefined });
        toast.success('Department created');
      }
      setIsModalOpen(false);
      fetchData();
      fetchAnalytics();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await DepartmentService.deleteDepartment(id);
      toast.success('Department deleted');
      setShowDeleteConfirm(null);
      fetchData();
      fetchAnalytics();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const getHeadName = (dept: Department): string => {
    if (dept.head_details?.full_name) return dept.head_details.full_name;
    if (dept.head && typeof dept.head === 'string' && dept.head !== 'Unassigned') return dept.head;
    return 'Unassigned';
  };

  const filteredDepartments = departments.filter(d =>
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getHeadName(d).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pieData = analytics?.departments?.map(d => ({
    name: d.name,
    value: d.employeeCount,
  })) || [];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-white">Departments</h1>
              <p className="text-gray-400 text-sm">Manage departments, assign heads, and monitor employee distribution.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-white/10" onClick={() => { fetchData(); fetchAnalytics(); }}>
                <RotateCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Department
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Departments', value: analytics?.totalDepartments || 0, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Total Employees', value: analytics?.totalEmployees || 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { label: 'Active Employees', value: analytics?.activeEmployees || 0, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Avg / Department', value: analytics?.avgEmployeesPerDept || 0, icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader><CardTitle className="text-white text-sm">Employees Per Department</CardTitle></CardHeader>
              <CardContent className="h-72">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                ) : pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.departments?.map(d => ({ name: d.name, Active: d.activeCount, Inactive: d.inactiveCount })) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0b132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Bar dataKey="Active" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Inactive" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader><CardTitle className="text-white text-sm">Department Distribution</CardTitle></CardHeader>
              <CardContent className="h-72">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                ) : pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0b132b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="p-4 border-b border-white/10">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Search departments..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Department</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Head</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Total Employees</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Active</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Inactive</th>
                    <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No departments found</p>
                      {searchTerm ? <p className="text-xs mt-1">Try adjusting your search</p> :
                        <button onClick={() => handleOpenModal()} className="text-blue-400 hover:text-blue-300 text-xs mt-1">Add your first department</button>}
                    </td></tr>
                  ) : filteredDepartments.map((dept, i) => (
                    <motion.tr key={dept.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <Link href={`/departments/${dept.id}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                              {dept.name}
                            </Link>
                            {dept.description && <p className="text-xs text-gray-500">{dept.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{getHeadName(dept)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{dept.employee_count || 0}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-green-400">{dept.head_details ? 'Active' : '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">-</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/departments/${dept.id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleOpenModal(dept)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(dept.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
              <button onClick={handleCloseModal} disabled={submitting}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{editMode ? 'Edit Department' : 'Add Department'}</h3>
                  <p className="text-xs text-gray-400">{editMode ? 'Update department information' : 'Create a new department'}</p>
                </div>
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Department Name <span className="text-red-400">*</span></label>
                  <input type="text" required autoFocus={!editMode} placeholder="e.g. Cybersecurity & SOC"
                    value={name} onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</label>
                  <textarea placeholder="Department description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Department Head</label>
                  <select value={headId} onChange={(e) => setHeadId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="">Unassigned</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button type="button" onClick={handleCloseModal} disabled={submitting}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || !name.trim()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                      : <><Save className="w-4 h-4" /><span>{editMode ? 'Update' : 'Save'} Department</span></>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center"><AlertCircle className="w-6 h-6" /></div>
                <div><h3 className="text-lg font-bold text-white">Delete Department</h3><p className="text-xs text-gray-400">This action cannot be undone.</p></div>
              </div>
              <p className="text-sm text-gray-300 mb-6">Are you sure you want to delete this department? Employees assigned to it will lose their department association.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="border-white/10" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm)} disabled={deleting}>
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Deleting...</> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
