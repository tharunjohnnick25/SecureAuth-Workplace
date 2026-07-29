'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { DepartmentService } from '@/lib/services/departments';
import { EmployeeService } from '@/lib/services/employees';
import { Department } from '@/types/departments';
import { Employee } from '@/types/employees';
import { Loader2, ArrowLeft, Building2, Users, UserCheck, Edit, Save, X, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [department, setDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  const [showHeadPicker, setShowHeadPicker] = useState(false);
  const [newHeadId, setNewHeadId] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dept = await DepartmentService.getDepartment(id);
      setDepartment(dept);
      const { data: emps } = await EmployeeService.getEmployees({ department: dept.name, limit: 500 });
      setEmployees(emps);
      const actives = await EmployeeService.getActiveEmployees();
      setActiveEmployees(actives);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load department');
      router.push('/departments');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSetHead = async () => {
    if (!newHeadId) return;
    setUpdating(true);
    try {
      await DepartmentService.setDepartmentHead(id, newHeadId);
      toast.success('Department head updated');
      setShowHeadPicker(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to set department head');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveHead = async () => {
    setUpdating(true);
    try {
      await DepartmentService.setDepartmentHead(id, null);
      toast.success('Department head removed');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove head');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!department) return null;

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const inactiveCount = employees.filter(e => e.status !== 'Active').length;

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <Link href="/departments" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Departments
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{department.name}</h2>
                  {department.description && (
                    <p className="text-sm text-gray-400 mt-2">{department.description}</p>
                  )}
                  <div className="mt-6 space-y-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Department Head</p>
                      {department.head_details ? (
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                            {department.head_details.full_name?.charAt(0) || 'U'}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{department.head_details.full_name}</p>
                            <p className="text-xs text-gray-500">{department.head_details.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 mt-2">Unassigned</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" className="border-white/10 text-xs h-8" onClick={() => setShowHeadPicker(true)}>
                          {department.head_details ? 'Change' : 'Assign'} Head
                        </Button>
                        {department.head_details && (
                          <Button variant="outline" className="border-red-500/20 text-red-400 text-xs h-8" onClick={handleRemoveHead} disabled={updating}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <Link href={`/departments`}>
                      <Button variant="outline" className="w-full border-white/10">
                        <Edit className="w-4 h-4 mr-1" /> Edit Department
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center">
                  <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{employees.length}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center">
                  <UserCheck className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader><CardTitle className="text-white text-sm">Employees in {department.name}</CardTitle></CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No employees in this department</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {employees.map(emp => (
                        <Link key={emp.id} href={`/employees/${emp.id}`}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : emp.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{emp.full_name}</p>
                              <p className="text-xs text-gray-500">{emp.designation || emp.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                              emp.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }`}>{emp.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showHeadPicker && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><UserCheck className="w-6 h-6" /></div>
                  <div><h3 className="text-lg font-bold text-white">Assign Department Head</h3><p className="text-xs text-gray-400">Only active employees can be assigned</p></div>
                </div>
                <button onClick={() => setShowHeadPicker(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <select value={newHeadId} onChange={(e) => setNewHeadId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white mb-6 focus:outline-none focus:border-blue-500">
                <option value="">Select an employee</option>
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="border-white/10" onClick={() => setShowHeadPicker(false)}>Cancel</Button>
                <Button onClick={handleSetHead} disabled={!newHeadId || updating} className="bg-blue-600 hover:bg-blue-500">
                  {updating ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : 'Assign'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
