'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Search, Shield, UserCog, MoreVertical, Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  department?: string;
  managerId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', managerId: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users?page=${page}&limit=20${roleFilter ? `&role=${roleFilter}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }
      
      toast.success(`Role updated to ${editForm.role} for ${editUser.name || editUser.email}`);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = search 
    ? users.filter(u => u.email.includes(search) || (u.name && u.name.toLowerCase().includes(search.toLowerCase())))
    : users;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-cyan-400" />
                  Access Management
                </h1>
                <p className="text-sm text-gray-400 mt-1">Manage user roles, departments, and permissions</p>
              </div>
            </div>

            <Card className="p-0 border-white/5 overflow-hidden bg-white/5 backdrop-blur-sm">
              <div className="p-4 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-white/[0.02]">
                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 text-white"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none text-white"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 bg-white/[0.02] uppercase border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Department</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{user.name || 'Unnamed User'}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              user.role === 'admin' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                              user.role === 'manager' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {user.department || '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setEditUser(user);
                                setEditForm({ role: user.role, department: user.department || '', managerId: user.managerId || '', reason: '' });
                              }}
                              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                            >
                              Edit Role
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        </main>
      </div>

      {/* Edit Role Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Edit Role Assignment</h2>
            <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="text-sm font-medium text-white">{editUser.name || editUser.email}</div>
              <div className="text-xs text-gray-400">{editUser.email}</div>
            </div>
            
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">New Role</label>
                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value})}
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Department</label>
                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  value={editForm.department}
                  onChange={e => setEditForm({...editForm, department: e.target.value})}
                >
                  <option value="">None</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reason (Audit Log)</label>
                <input 
                  type="text" 
                  placeholder="e.g., Promotion, Internal Transfer..." 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  value={editForm.reason}
                  onChange={e => setEditForm({...editForm, reason: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                <Button type="button" onClick={() => setEditUser(null)} className="bg-transparent hover:bg-white/5 border border-white/10 text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[100px]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
