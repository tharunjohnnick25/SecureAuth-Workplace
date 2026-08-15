'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { User, Shield, Briefcase, Mail, MapPin, Building, Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employees');
      const json = await res.json();
      if(json.success) setEmployees(json.data);
    } catch(err) {
       console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      key: 'full_name', 
      label: 'Employee',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/admin/employees/${row.id}`)}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            {val ? val.charAt(0).toUpperCase() : <User className="w-4 h-4"/>}
          </div>
          <div>
            <p className="text-sm font-medium text-white hover:text-blue-400 transition-colors">{val || 'Unknown User'}</p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      )
    },
    { 
      key: 'department', 
      label: 'Department',
      render: (val: string) => (
        <div className="flex items-center gap-2">
           <Building className="w-3 h-3 text-gray-400" />
           <span className="text-sm">{val || 'Unassigned'}</span>
        </div>
      )
    },
    { 
      key: 'designation', 
      label: 'Designation',
      render: (val: string) => <span className="text-sm">{val || 'N/A'}</span>
    },
    { 
      key: 'role', 
      label: 'Role',
      render: (val: string) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          val === 'ADMIN' || val === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-cyan-500/100/10 text-blue-400 border border-blue-500/20'
        }`}>
          {val || 'USER'}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          val === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {val?.toUpperCase() || 'UNKNOWN'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <label className="cursor-pointer px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-md text-xs font-semibold transition-colors flex items-center gap-1">
            <span className="truncate">Upload Face</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFaceUpload(e, row.id)} 
            />
          </label>
        </div>
      )
    }
  ];

  const handleFaceUpload = async (e: React.ChangeEvent<HTMLInputElement>, employeeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      
      const toastId = toast.loading('Uploading & encoding face...');
      try {
        const res = await fetch('/api/admin/enroll-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, image: base64Image })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to register face');
        toast.success('Face successfully enrolled for verification!', { id: toastId });
      } catch (err: any) {
        toast.error(err.message, { id: toastId });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <DataGridPage 
      title="Employee Directory" 
      description="Manage enterprise identities, assign departments, and control roles."
      columns={columns}
      data={employees}
      loading={loading}
      onRefresh={fetchEmployees}
      filters={[
        { key: 'department', label: 'Department' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' },
      ]}
      primaryAction={{ label: 'Add Employee', icon: UserPlus, onClick: () => router.push('/employees/new') }}
    />
  );
}
