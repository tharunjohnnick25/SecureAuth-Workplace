'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmployeeService } from '@/lib/services/employees';
import { Employee, EmployeeStatus } from '@/types/employees';
import { Search, Filter, Plus, Download, Upload, IdCard, MoreVertical, Eye, Edit, Trash2, X, ChevronDown, RotateCw, Loader2, AlertCircle, Users, UserPlus, FileSpreadsheet, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from "@/context/LanguageContext";

import { useAuthStore } from '@/store/useAuthStore';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-400 border-green-500/20',
  Inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Resigned: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'On Leave': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Retired: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_OPTIONS: EmployeeStatus[] = ['Active', 'Inactive', 'Resigned', 'On Leave', 'Suspended', 'Retired', 'Terminated'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Temporary'];
const GENDERS = ['Male', 'Female', 'Other'];

export default function EmployeesPage() {
    const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuthStore();
  const userDomain = user?.email?.split('@')[1];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleFaceUpload = async (e: React.ChangeEvent<HTMLInputElement>, employeeId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const fullDataUrl = event.target?.result as string;
      // Strip out the data:image/jpeg;base64, prefix
      const base64Image = fullDataUrl.split(',')[1];
      
      const toastId = toast.loading('Uploading & encoding face...');
      try {
        const res = await fetch('/api/auth/enroll-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, image: base64Image })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to register face');
        toast.success(data.message || 'Successfully enrolled face template!', { id: toastId });
      } catch (err: any) {
        toast.error(err.message, { id: toastId });
      }
    };
    reader.readAsDataURL(file);
  };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const isManager = user?.role === 'MANAGER';
      const enforcedDepartment = isManager ? user?.department : undefined;

      const result = await EmployeeService.getEmployees({
        search: searchTerm || undefined,
        ...filters,
        department: enforcedDepartment || filters.department,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setEmployees(result.data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, sortBy, sortOrder, user]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  useEffect(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    setDepartments(Array.from(depts) as string[]);
  }, [employees]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await EmployeeService.deleteEmployee(id);
      toast.success('Employee deleted successfully');
      setShowDeleteConfirm(null);
      loadEmployees();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await EmployeeService.importEmployees(importFile);
      setImportResult(result);
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} employees successfully`);
        loadEmployees();
      }
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      await EmployeeService.exportEmployees('csv', {
        ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
        ...filters,
      });
      toast.success('Employees exported successfully');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await EmployeeService.updateEmployee(id, { status } as any);
      toast.success(`Status updated to ${status}`);
      loadEmployees();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(employees.map(e => e.id)));
  };

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(emp =>
        emp.full_name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.employee_id?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term) ||
        emp.designation?.toLowerCase().includes(term) ||
        emp.phone?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [employees, searchTerm]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-white">{'Employee directory'}</h1>
              <p className="text-gray-400 text-sm">{'Manage employees'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg">{selectedIds.size} {'Selected'}</span>
              )}
              <Button onClick={() => setShowImport(true)} variant="outline" className="border-white/10">
                <Upload className="w-4 h-4 mr-1.5" /> {'Import'}</Button>
              <Button onClick={handleExport} variant="outline" className="border-white/10">
                <Download className="w-4 h-4 mr-1.5" /> {'Export'}</Button>
              <Link href="/employees/new">
                <Button className="bg-blue-600 hover:bg-blue-500">
                  <UserPlus className="w-4 h-4 mr-1.5" /> {'Add employee'}</Button>
              </Link>
            </div>
          </div>

          <Card className="border-white/10 bg-black/40 backdrop-blur-xl mb-6">
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name, email, ID, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white placeholder-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-white/10" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="w-4 h-4 mr-1.5" /> {'Filters'}<ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                <Button variant="outline" className="border-white/10" onClick={loadEmployees}>
                  <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-white/10 overflow-hidden">
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    <select value={filters.status || ''} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">{'All status'}</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                      value={user?.role === 'MANAGER' ? user?.department : (filters.department || '')} 
                      onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))} 
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
                      disabled={user?.role === 'MANAGER'}
                    >
                      <option value="">{'All departments'}</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filters.designation || ''} onChange={(e) => setFilters(f => ({ ...f, designation: e.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">{'All designations'}</option>
                      {Array.from(new Set(employees.map(e => e.designation).filter(Boolean))).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filters.gender || ''} onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">{'All genders'}</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={filters.employment_type || ''} onChange={(e) => setFilters(f => ({ ...f, employment_type: e.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">{'All types'}</option>
                      {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {Object.keys(filters).length > 0 && (
                      <button onClick={() => setFilters({})} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                        <X className="w-3 h-3" /> {'Clear filters'}</button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-gray-400">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selectedIds.size === employees.length && employees.length > 0} onChange={toggleSelectAll} className="rounded border-white/20" />
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs cursor-pointer" onClick={() => { setSortBy('full_name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                      {'Employee'}{sortBy === 'full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">{'Department'}</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">{'Designation'}</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">{'Type'}</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">{'AI Risk'}</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">{'Status'}</th>
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-xs">{'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        {'Loading employees...'}</td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{'No employees found'}</p>
                        {searchTerm || Object.keys(filters).length > 0 ? (
                          <p className="text-xs mt-1">{'Try adjusting your search or filters'}</p>
                        ) : (
                          <Link href="/employees/new" className="text-blue-400 hover:text-blue-300 text-xs mt-1 inline-block">{'Add your first employee'}</Link>
                        )}
                      </td>
                    </tr>
                  ) : filteredEmployees.map((emp) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={emp.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded border-white/20" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`/employees/${emp.id}`} className="flex items-center gap-3 hover:opacity-80">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {emp.avatar_url ? (
                                <img src={emp.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                emp.full_name?.charAt(0) || 'U'
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{emp.full_name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{emp.email}{emp.employee_id ? ` · ${emp.employee_id}` : ''}</div>
                            </div>
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{emp.department || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{emp.designation || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{emp.employment_type || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Shield className={`w-4 h-4 ${(emp.risk_score || 0) < 30 ? 'text-green-400' : (emp.risk_score || 0) < 70 ? 'text-yellow-400' : 'text-red-400'}`} />
                          <span className={`text-xs font-bold ${(emp.risk_score || 0) < 30 ? 'text-green-400' : (emp.risk_score || 0) < 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {emp.risk_score || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative group/status">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border cursor-pointer block w-fit ${STATUS_STYLES[emp.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                            {emp.status || 'Unknown'}
                          </span>
                          <div className="absolute left-0 top-full mt-1 bg-[#0b132b] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 hidden group-hover/status:block min-w-[130px]">
                            {STATUS_OPTIONS.filter(s => s !== emp.status).map(s => (
                              <button key={s} onClick={() => updateStatus(emp.id, s)}
                                className="block w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors">
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer relative group/upload">
                            <Upload className="w-4 h-4" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              multiple
                              onChange={(e) => handleFaceUpload(e, emp.id)} 
                            />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs text-white opacity-0 group-hover/upload:opacity-100 pointer-events-none whitespace-nowrap">
                              Upload Face(s)
                            </div>
                          </label>
                          <Link href={`/employees/${emp.id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/employees/${emp.id}/edit`} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setShowDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-between items-center text-sm text-gray-400">
              <span>{filteredEmployees.length} {'Employee'}{filteredEmployees.length !== 1 ? 's' : ''}</span>
            </div>
          </Card>
        </main>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{'Delete employee'}</h3>
                  <p className="text-xs text-gray-400">{'This action cannot be undone'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-6">{'Are you sure you want to delete this employee?'}</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="border-white/10" onClick={() => setShowDeleteConfirm(null)}>{'Cancel'}</Button>
                <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm)} disabled={deleting}>
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {'Deleting'}</> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{'Import employees'}</h3>
                    <p className="text-xs text-gray-400">{'Upload a CSV file with employee data'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!importResult ? (
                <>
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); setImportFile(e.dataTransfer.files[0]); }}>
                    {importFile ? (
                      <div>
                        <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                        <p className="text-sm text-white font-medium">{importFile.name}</p>
                        <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} {'Kb'}</p>
                        <button onClick={() => setImportFile(null)} className="text-xs text-red-400 hover:text-red-300 mt-2">{'Remove'}</button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-500" />
                        <p className="text-sm text-gray-400">{'Drop a CSV file here'}</p>
                        <p className="text-xs text-gray-500 mt-1">{'Required columns: name, email, department'}</p>
                        <input type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" id="import-file" />
                        <label htmlFor="import-file" className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer mt-2 inline-block">{'Browse files'}</label>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" className="border-white/10" onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>{'Cancel'}</Button>
                    <Button onClick={handleImport} disabled={!importFile || importing} className="bg-emerald-600 hover:bg-emerald-500">
                      {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {'Importing'}</> : 'Import'}
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                    <p className="text-emerald-400 font-semibold">{'Import complete'}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-300">{'Total'}<strong className="text-white">{importResult.total}</strong></span>
                      <span className="text-emerald-400">{'Imported'}<strong>{importResult.imported}</strong></span>
                      <span className="text-yellow-400">{'Skipped'}<strong>{importResult.skipped}</strong></span>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 mb-4">
                      {importResult.errors.map((err: any, i: number) => (
                        <p key={i} className="text-xs text-red-400">{'Row'}{err.row}: {err.message}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>{'Done'}</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
