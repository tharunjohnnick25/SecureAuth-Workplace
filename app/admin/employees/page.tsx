'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { DataGridPage } from '@/components/pages/DataGridPage';
import { User, Shield, Briefcase, Mail, MapPin, Building, Loader2, UserPlus, Phone, Smartphone, KeyRound, UserCheck } from 'lucide-react';
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
           <Building className="w-3.5 h-3.5 text-gray-400" />
           <span className="text-sm">{val || 'Unassigned'}</span>
        </div>
      )
    },
    { 
      key: 'role', 
      label: 'Role',
      render: (val: string) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          val === 'ADMIN' || val === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-cyan-500/10 text-blue-400 border border-blue-500/20'
        }`}>
          {val || 'USER'}
        </span>
      )
    },
    {
      key: 'phone_status',
      label: 'Phone Status',
      render: (_: any, row: any) => {
        const isVerified = row.phone_status === 'Verified';
        return (
          <div className="flex flex-col">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold w-fit ${
              isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {row.phone_status || 'Not Set'}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 font-mono">{row.masked_phone}</span>
          </div>
        );
      }
    },
    {
      key: 'totp_status',
      label: 'TOTP Status',
      render: (_: any, row: any) => {
        const isEnabled = row.totp_status === 'Enabled';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            isEnabled ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
          }`}>
            {row.totp_status || 'Disabled'}
          </span>
        );
      }
    },
    {
      key: 'passkey_status',
      label: 'Passkey Status',
      render: (_: any, row: any) => {
        const isRegistered = row.passkey_status && row.passkey_status !== 'Not Registered';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            isRegistered ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
          }`}>
            {row.passkey_status || 'Not Registered'}
          </span>
        );
      }
    },
    {
      key: 'face_status',
      label: 'Face Verification',
      render: (_: any, row: any) => {
        const isVerified = row.face_status === 'Verified';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {row.face_status || 'Not Enrolled'}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Account Status',
      render: (val: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          val?.toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
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
        toast.success('Face successfully enrolled for verification!', { id: toastId });
        fetchEmployees();
      } catch (err: any) {
        toast.error(err.message, { id: toastId });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <DataGridPage 
      title="Employee Directory" 
      description="Manage enterprise identities, MFA enrollment statuses, and biometric security controls."
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
