'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmployeeService } from '@/lib/services/employees';
import { EmployeeFormData, EmployeeStatus, EmploymentType, Gender, BloodGroup } from '@/types/employees';
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { DepartmentService } from '@/lib/services/departments';
import { Department } from '@/types/departments';

const STATUS_OPTIONS: EmployeeStatus[] = ['Active', 'Inactive', 'Resigned', 'On Leave', 'Suspended', 'Retired', 'Terminated'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Temporary'];
const GENDERS: Gender[] = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function NewEmployeePage() {
  const router = useRouter();
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
    date_of_joining: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    DepartmentService.getDepartments().then(setDepartments).catch(() => {});
    EmployeeService.getActiveEmployees().then(emps => setActiveEmployees(emps.map(e => ({ id: e.id, full_name: e.full_name || '' })))).catch(() => {});
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name?.trim()) errs.full_name = 'Full name is required';
    if (form.full_name && form.full_name.length < 2) errs.full_name = 'Name must be at least 2 characters';
    if (!form.email?.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) errs.phone = 'Invalid phone number';
    if (!form.department) errs.department = 'Department is required';
    if (!form.designation?.trim()) errs.designation = 'Designation is required';
    if (form.salary && Number(form.salary) < 0) errs.salary = 'Salary cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const emp = await EmployeeService.createEmployee(form as any);
      toast.success('Employee created successfully');
      router.push(`/employees/${emp.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Directory
            </Link>
            <h1 className="text-3xl font-bold text-white">Add New Employee</h1>
            <p className="text-gray-400 text-sm mt-1">Fill in the employee details below.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader><CardTitle className="text-white">Personal Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Full Name <span className="text-red-400">*</span></label>
                        <input type="text" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)}
                          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors ${errors.full_name ? 'border-red-500' : 'border-white/10'}`} placeholder="John Doe" />
                        {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email <span className="text-red-400">*</span></label>
                        <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)}
                          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors ${errors.email ? 'border-red-500' : 'border-white/10'}`} placeholder="john@company.com" />
                        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Phone</label>
                        <input type="tel" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" placeholder="+1 234 567 890" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Gender</label>
                        <select value={form.gender || ''} onChange={(e) => updateField('gender', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">Select Gender</option>
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Date of Birth</label>
                        <input type="date" value={form.date_of_birth || ''} onChange={(e) => updateField('date_of_birth', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Blood Group</label>
                        <select value={form.blood_group || ''} onChange={(e) => updateField('blood_group', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">Select Blood Group</option>
                          {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Address</label>
                        <textarea value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Full address" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader><CardTitle className="text-white">Employment Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Department <span className="text-red-400">*</span></label>
                        <select value={form.department} onChange={(e) => updateField('department', e.target.value)}
                          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 ${errors.department ? 'border-red-500' : 'border-white/10'}`}>
                          <option value="">Select Department</option>
                          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                        {errors.department && <p className="text-xs text-red-400 mt-1">{errors.department}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Designation <span className="text-red-400">*</span></label>
                        <input type="text" value={form.designation} onChange={(e) => updateField('designation', e.target.value)}
                          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors ${errors.designation ? 'border-red-500' : 'border-white/10'}`} placeholder="Software Engineer" />
                        {errors.designation && <p className="text-xs text-red-400 mt-1">{errors.designation}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Employment Type</label>
                        <select value={form.employment_type} onChange={(e) => updateField('employment_type', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Date of Joining</label>
                        <input type="date" value={form.date_of_joining || ''} onChange={(e) => updateField('date_of_joining', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Manager</label>
                        <select value={form.manager_id || ''} onChange={(e) => updateField('manager_id', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
                          <option value="">No Manager</option>
                          {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Salary</label>
                        <input type="number" value={form.salary || ''} onChange={(e) => updateField('salary', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Annual salary" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Emergency Contact</label>
                        <input type="text" value={form.emergency_contact || ''} onChange={(e) => updateField('emergency_contact', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Emergency contact number" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Status</label>
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
                  <CardHeader><CardTitle className="text-white">Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="text-white">{form.full_name || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="text-white">{form.email || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Department</span><span className="text-white">{form.department || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Designation</span><span className="text-white">{form.designation || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="text-white">{form.employment_type}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="text-white">{form.status}</span></div>
                    <div className="pt-4 border-t border-white/10">
                      <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : <><Save className="w-4 h-4 mr-1" /> Save Employee</>}
                      </Button>
                    </div>
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
