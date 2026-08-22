'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Shield,
  ShieldAlert,
  Smartphone,
  BarChart3,
  Settings,
  Users,
  Bell,
  Target,
  FileCheck,
  Plug,
  UserCog,
  FileText,
  CreditCard,
  Clock,
  Building2,
  MapPin,
  LogOut,
  ClipboardList,
  HardDrive,
  ScanFace,
  MessageSquare,
  Video,
  Globe,
  Mail,
  BellRing,
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuthStore } from '../store/useAuthStore';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const navigationSectionsConfig = [
  {
    title: 'Team Management',
    items: [
      { id: 'managerTeam', name: 'My Team', href: '/manager/team', icon: Users, roles: ['MANAGER'] },
      { id: 'employees', name: 'Employee Directory', href: '/employees', icon: Users, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'] },
      { id: 'requestsAdmin', name: 'Requests & Approvals', href: '/requests', icon: FileCheck, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'] },
      { id: 'orgStructure', name: 'Organization Structure', href: '/org-structure', icon: Building2, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'] },
    ],
  },
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'attendance', name: 'Attendance & Login', href: '/attendance', icon: Clock, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { id: 'tasks', name: 'My Tasks', href: '/tasks', icon: FileCheck, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'chat', name: 'Chat with Colleagues', href: '/chat', icon: MessageSquare, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'calendar', name: 'Calendar', href: '/calendar', icon: Clock, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'leaves', name: 'Leave Management', href: '/leaves', icon: Clock, roles: ['MANAGER', 'EMPLOYEE'] },
      { id: 'vault', name: 'Personal Vault', href: '/vault', icon: FileText, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'workspace', name: 'Company Drive', href: '/workspace', icon: HardDrive, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'resources', name: 'Office Resources', href: '/resources', icon: ShieldAlert, roles: ['MANAGER', 'EMPLOYEE'] },
      { id: 'meetings', name: 'Video Meetings', href: '/meetings', icon: Video, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'mail', name: 'Internal Mail', href: '/mail', icon: Mail, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'reminders', name: 'Automated Reminders', href: '/reminders', icon: BellRing, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { id: 'employeeCompiler', name: 'Code Compiler', href: '/compiler', icon: Plug, roles: ['EMPLOYEE'] },
    ],
  },
  {
    title: 'Office Security',
    items: [
      { id: 'unifiedSecurity', name: 'Security', href: '/security', icon: Shield, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'] },
    ],
  },
  {
    title: 'System & RBAC Management',
    items: [
      { id: 'devices', name: 'Hardware Tokens', href: '/admin/devices', icon: Smartphone, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'] },
      { id: 'rbacAudit', name: 'Role Audit Logs', href: '/admin/audit', icon: ClipboardList, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'] },
      { id: 'settings', name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'EMPLOYEE'] },
    ],
  },
];

export function SidebarContent() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  
  const userRole = (user?.role || 'EMPLOYEE').toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch('/api/attendance/checkout', { method: 'POST' });
      const supabase = createClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        // localStorage.removeItem('secureauth-session'); removed
      }
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-6 px-2">
        <Link 
          href={userRole === 'MANAGER' ? '/manager/dashboard' : '/dashboard'} 
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 overflow-hidden flex items-center justify-center shrink-0">
            <img src="/new-logo.png" alt="SecureAuth Workplace Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-semibold text-white truncate">SecureAuth Workplace</h2>
            <p className="text-xs text-gray-400">{['ADMIN', 'SUPER_ADMIN'].includes(userRole) ? 'Admin Portal' : userRole === 'MANAGER' ? 'Manager Portal' : 'Employee Access'}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        <div className="space-y-4">
          {navigationSectionsConfig.map((section) => {
            const filteredItems = section.items.filter(item => item.roles.includes(userRole));
            
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title}>
                <h3 className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {t(section.title)}
                </h3>
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const href = item.id === 'dashboard' && userRole === 'MANAGER' ? '/manager/dashboard' : item.href;
                    const isActive = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        data-nav-id={item.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{t(item.name)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors flex-1 min-w-0">
          {user?.avatar_url || user?.profile_picture ? (
            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-black flex-shrink-0">
              <img src={user.avatar_url || user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{user?.full_name || 'Loading...'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <motion.aside 
      className="fixed left-0 top-0 h-full w-64 glass-sidebar z-[45] hidden lg:block border-r border-white/10"
    >
      <SidebarContent />
    </motion.aside>
  );
}
