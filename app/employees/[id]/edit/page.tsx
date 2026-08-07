'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmployeeService } from '@/lib/services/employees';
import { DepartmentService } from '@/lib/services/departments';
import { EmployeeFormData, EmployeeStatus, EmploymentType, Gender, BloodGroup } from '@/types/employees';
import { Department } from '@/types/departments';
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useLanguage } from "@/context/LanguageContext";

const STATUS_OPTIONS: EmployeeStatus[] = ['Active', 'Inactive', 'Resigned', 'On Leave', 'Suspended', 'Retired', 'Terminated'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Temporary'];
const GENDERS: Gender[] = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditEmployeePage() {
    const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeEmployees, setActiveEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState<EmployeeFormData>({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employment_type: 'Full-time',
    status: 'Active',
    gender: '',
    blood_group: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      EmployeeService.getEmployee(id),
      DepartmentService.getDepartments(),
      EmployeeService.getActiveEmployees(),
    ]).then(([emp, depts, actives]) => {
      setForm({
        full_name: emp.full_name || '',
        email: emp.email,
        phone: emp.phone || '',
        department: emp.department || '',
        designation: emp.designation || '',
        employment_type: emp.employment_type || 'Full-time',
        status: emp.status || 'Active',
        gender: emp.gender || '',
        blood_group: emp.blood_group || '',
        date_of_joining: emp.date_of_joining?.split('T')[0] || '',
        date_of_birth: emp.date_of_birth?.split('T')[0] || '',
        address: emp.address || '',
        emergency_contact: emp.emergency_contact || '',
        manager_id: emp.manager_id || '',
        salary: emp.salary || undefined,
      });
      setDepartments(depts);
      setActiveEmployees(actives.map(e => ({ id: e.id, full_name: e.full_name || '' })));
      setLoading(false);
    }).catch((e) => {
      toast.error(e.message || 'Failed to load employee');
      router.push('/employees');
    });
  }, [id, router]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name?.trim()) errs.full_name = 'Full name is required';
    if (!form.email?.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) errs.phone = 'Invalid phone number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await EmployeeService.updateEmployee(id, form as any);
      toast.success('Employee updated successfully');
      router.push(`/employees/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <Link href={`/employees/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> {'Backto profile'}</Link>
            <h1 className="text-3xl font-bold text-white">{'Edit employee'}</h1>
            <p className="text-gray-400 text-sm mt-1">{'Updateemployeei'}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader><CardTitle className="text-white">{'Personal informa'}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Full name'}<span className="text-red-400">*</span></label>
                        <input type="text" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)}
                          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors ${errors.full_name ? 'border-red-500' : 'border-white/10'}`} />
                        {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Email'}<span className="text-red-400">*</span></label>
                        <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)}
                          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors ${errors.email ? 'border-red-500' : 'border-white/10'}`} />
                        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Phone'}</label>
                        <input type="tel" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Gender'}</label>
                        <select value={form.gender || ''} onChange={(e) => updateField('gender', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">{'Select gender'}</option>
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Dateof birth'}</label>
                        <input type="date" value={form.date_of_birth || ''} onChange={(e) => updateField('date_of_birth', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Blood group'}</label>
                        <select value={form.blood_group || ''} onChange={(e) => updateField('blood_group', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">{'Select blood grou'}</option>
                          {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Address'}</label>
                        <textarea value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader><CardTitle className="text-white">{'Employment detai'}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Department'}</label>
                        <select value={form.department || ''} onChange={(e) => updateField('department', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">{'Select departmen'}</option>
                          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Designation'}</label>
                        <input type="text" value={form.designation} onChange={(e) => updateField('designation', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Employment type'}</label>
                        <select value={form.employment_type} onChange={(e) => updateField('employment_type', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Dateof joining'}</label>
                        <input type="date" value={form.date_of_joining || ''} onChange={(e) => updateField('date_of_joining', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Manager'}</label>
                        <select value={form.manager_id || ''} onChange={(e) => updateField('manager_id', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">{'No manager'}</option>
                          {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Salary'}</label>
                        <input type="number" value={form.salary || ''} onChange={(e) => updateField('salary', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Emergency contac'}</label>
                        <input type="text" value={form.emergency_contact || ''} onChange={(e) => updateField('emergency_contact', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{'Status'}</label>
                        <select value={form.status} onChange={(e) => updateField('status', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl sticky top-24">
                  <CardHeader><CardTitle className="text-white">{'Actions'}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500">
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {'Saving'}</> : <><Save className="w-4 h-4 mr-1" /> {'Update employee'}</>}
                    </Button>
                    <Link href={`/employees/${id}`} className="block">
                      <Button type="button" variant="outline" className="w-full border-white/10">{'Cancel'}</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
