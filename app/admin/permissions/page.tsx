'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Shield, Lock, Check, X, Save } from 'lucide-react';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

const PERMISSIONS = [
  'users:read', 'users:write', 'users:delete',
  'roles:read', 'roles:write',
  'audit:read',
  'security:read', 'security:write',
];

const ROLES = ['Admin', 'Security Analyst', 'Auditor', 'User'];

export default function AccessControlMatrixPage() {
    const { t } = useLanguage();
  const [matrix, setMatrix] = useState<Record<string, string[]>>({
    'Admin': PERMISSIONS,
    'Security Analyst': ['audit:read', 'security:read', 'security:write', 'users:read'],
    'Auditor': ['audit:read', 'security:read'],
    'User': ['users:read'],
  });

  const togglePermission = (role: string, permission: string) => {
    setMatrix(prev => {
      const rolePermissions = prev[role] || [];
      if (rolePermissions.includes(permission)) {
        return { ...prev, [role]: rolePermissions.filter(p => p !== permission) };
      } else {
        return { ...prev, [role]: [...rolePermissions, permission] };
      }
    });
  };

  const handleSave = () => {
    toast.success('Access control matrix updated successfully');
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Access control matrix'}</h1>
              <p className="text-muted-foreground">{'Define and manage'}</p>
            </div>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {'Save changes'}</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4 text-left font-medium text-muted-foreground bg-muted/50">{'Permission'}</th>
                      {ROLES.map(role => (
                        <th key={role} className="p-4 text-center font-medium text-muted-foreground bg-muted/50">
                          {role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map(permission => (
                      <tr key={permission} className="border-b border-border hover:bg-input-background/20 transition-colors">
                        <td className="p-4 font-mono text-sm">{permission}</td>
                        {ROLES.map(role => {
                          const hasPermission = matrix[role]?.includes(permission);
                          return (
                            <td key={role} className="p-4 text-center">
                              <button
                                onClick={() => togglePermission(role, permission)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                  hasPermission 
                                    ? 'bg-primary/20 text-primary border border-primary/30' 
                                    : 'bg-muted/30 text-muted-foreground border border-transparent'
                                }`}
                              >
                                {hasPermission ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
