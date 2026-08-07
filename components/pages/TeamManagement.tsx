'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  Mail, 
  Calendar,
  ChevronRight,
  Download
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

export function TeamManagement() {
    const { t } = useLanguage();
  const { data: users, loading } = useRealtimeData('users');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    return (users as any[]).filter((user: any) => 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Email', 'Role', 'Created At'],
      ...(filteredUsers as any[]).map((u: any) => [u.id, u.full_name, u.email, u.role, u.created_at])
    ].map(e => e.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    toast.success('User data exported successfully');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <PageHeader 
            title="User Directory" 
            description="Manage enterprise access and identity profiles"
          >
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              {'Export'}</Button>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              {'Invite member'}</Button>
          </PageHeader>

          <Card className="mb-6">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Search by name, email or ID..."
                  icon={<Search className="w-4 h-4" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
                <div className="h-8 w-[1px] bg-border mx-2" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {'Showing'}{(filteredUsers as any[]).length} {'Of'}{(users as any[]).length} {'Users'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                      <th className="px-6 py-4">{'User'}</th>
                      <th className="px-6 py-4">{'Security role'}</th>
                      <th className="px-6 py-4">{'Status'}</th>
                      <th className="px-6 py-4">{'Joined'}</th>
                      <th className="px-6 py-4 text-right">{'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(filteredUsers as any[]).map((user: any) => (
                      <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20">
                              <span className="text-sm font-bold text-primary">
                                {user.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{user.full_name || 'Unnamed User'}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Shield className={`w-4 h-4 ${user.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-sm capitalize font-medium">{user.role || 'User'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            <span className="text-sm font-medium">{'Active'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="hover:bg-muted">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(filteredUsers as any[]).length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                               <Users className="w-8 h-8 text-muted-foreground" />
                             </div>
                             <p className="text-muted-foreground">{'Nousersfoundmat'}</p>
                          </div>
                        </td>
                      </tr>
                    )}
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

