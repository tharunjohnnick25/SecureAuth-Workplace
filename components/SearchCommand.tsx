'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  LayoutDashboard, 
  Shield, 
  Smartphone, 
  BarChart3, 
  Settings, 
  Users, 
  Bell, 
  Target, 
  Globe, 
  FileText, 
  Video, 
  MessageSquare, 
  Calendar, 
  FileCheck, 
  Clock, 
  HardDrive, 
  ClipboardList, 
  CreditCard, 
  Plug, 
  UserCog, 
  ShieldAlert, 
  User, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from "@/store/useAuthStore";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';

const STATIC_PAGES = [
  { group: 'Overview', items: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', href: '/attendance', icon: Clock },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
  ]},
  { group: 'Work & Collaboration', items: [
    { name: 'My Tasks', href: '/tasks', icon: FileCheck },
    { name: 'Chat with Colleagues', href: '/chat', icon: MessageSquare },
    { name: 'Leave Management', href: '/leaves', icon: Clock },
    { name: 'Personal Vault', href: '/vault', icon: FileText },
    { name: 'Company Drive', href: '/workspace', icon: HardDrive },
    { name: 'Video Meetings', href: '/meetings', icon: Video },
    { name: 'Automated Reminders', href: '/reminders', icon: Bell },
  ]},
  { group: 'Security', items: [
    { name: 'Security', href: '/security', icon: Shield },
    { name: 'Threat Intelligence', href: '/threat-intelligence', icon: Target },
    { name: 'AI Risk Monitoring', href: '/dashboard/risk', icon: ShieldAlert },
    { name: 'Device Fingerprinting', href: '/devices', icon: Smartphone },
  ]},
  { group: 'Administration', items: [
    { name: 'Employee Directory', href: '/employees', icon: Users },
    { name: 'Requests & Approvals', href: '/requests', icon: FileCheck },
    { name: 'Organization Structure', href: '/org-structure', icon: Building2 },
    { name: 'System Overview', href: '/system-management', icon: BarChart3 },
  ]},
  { group: 'Integration', items: [

    { name: 'Settings', href: '/settings', icon: Settings },
  ]}
];

export function GlobalSearch() {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [dynamicResults, setDynamicResults] = React.useState<{users: any[], alerts: any[], devices: any[], meetings: any[]}>({
    users: [],
    alerts: [],
    devices: [],
    meetings: []
  });
  const router = useRouter();
  const supabase = createClient();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    if (search.length < 2) {
      setDynamicResults({ users: [], alerts: [], devices: [], meetings: [] });
      return;
    }

    const performSearch = async () => {
      if (MOCK_MODE) {
        const q = encodeURIComponent(search);
        const [uRes, mRes] = await Promise.all([
          fetch(`/api/employees?search=${q}&limit=3`).catch(() => null),
          user?.id
            ? fetch(`/api/meetings?user_id=${encodeURIComponent(user.id)}`).catch(() => null)
            : Promise.resolve(null),
        ]);

        let users: any[] = [];
        if (uRes && uRes.ok) {
          const uData = await uRes.json();
          users = (uData.data || []).slice(0, 3);
        }

        let meetings: any[] = [];
        if (mRes && mRes.ok) {
          const mData = await mRes.json();
          const term = search.toLowerCase();
          meetings = (mData.data || [])
            .filter((m: any) => String(m.title || '').toLowerCase().includes(term))
            .slice(0, 3);
        }

        setDynamicResults({ users, alerts: [], devices: [], meetings });
        return;
      }

      const [uRes, aRes, dRes] = await Promise.all([
        supabase.from('users').select('id, full_name, email').ilike('full_name', `%${search}%`).limit(3),
        supabase.from('alerts').select('id, message, type').ilike('message', `%${search}%`).limit(3),
        supabase.from('devices').select('id, device_name, browser').ilike('device_name', `%${search}%`).limit(3)
      ]);

      setDynamicResults({
        users: uRes.data || [],
        alerts: aRes.data || [],
        devices: dRes.data || [],
        meetings: []
      });
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="relative group cursor-pointer w-full max-w-md"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <div className="w-full rounded-lg bg-input-background/50 border border-border px-10 py-2.5 text-sm text-muted-foreground group-hover:border-primary/50 transition-all">
          {'Search entities...'}</div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-medium text-muted-foreground">
          {'K'}</div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0f0f23] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              <Command className="flex flex-col h-full">
                <div className="flex items-center border-b border-gray-200 dark:border-white/10 p-4 bg-gray-50 dark:bg-[#1a1a2e]">
                  <Search className="w-5 h-5 text-gray-400 mr-3" />
                  <Command.Input
                    autoFocus
                    placeholder="Search users, meetings, pages..."
                    value={search}
                    onValueChange={setSearch}
                    className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                  />
                </div>

                <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-py-2 bg-white dark:bg-[#1a1a2e] rounded-b-xl">
                  <Command.Empty className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    {'No results found for "'}{search}{'"'}</Command.Empty>

                  {/* Dynamic Results */}
                  {dynamicResults.users.length > 0 && (
                    <Command.Group heading="Users Found" className="px-2 py-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">
                       {dynamicResults.users.map((u: any) => (
                         <Command.Item key={u.id} onSelect={() => handleSelect(`/admin/users?id=${u.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer">
                            <User className="w-4 h-4 text-blue-500" />
                            <span>{u.full_name}</span>
                            <span className="text-xs text-gray-400 ml-auto truncate">{u.email}</span>
                         </Command.Item>
                       ))}
                    </Command.Group>
                  )}

                  {dynamicResults.meetings.length > 0 && (
                    <Command.Group heading="Meetings Found" className="px-2 py-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">
                       {dynamicResults.meetings.map((m: any) => (
                         <Command.Item key={m.id} onSelect={() => handleSelect(`/meetings/${m.id}/pre-join`)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-500/10 cursor-pointer">
                            <Video className="w-4 h-4 text-green-500" />
                            <span className="truncate">{m.title}</span>
                            <span className="text-xs text-gray-400 ml-auto truncate">{m.host_name}</span>
                         </Command.Item>
                       ))}
                    </Command.Group>
                  )}

                  {dynamicResults.alerts.length > 0 && (
                    <Command.Group heading="Security Alerts" className="px-2 py-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">
                       {dynamicResults.alerts.map((a: any) => (
                         <Command.Item key={a.id} onSelect={() => handleSelect(`/security/alerts?id=${a.id}`)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="truncate">{a.message}</span>
                         </Command.Item>
                       ))}
                    </Command.Group>
                  )}

                  {STATIC_PAGES.map((group) => (
                    <Command.Group 
                      key={group.group} 
                      heading={group.group}
                      className="px-2 py-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mt-2"
                    >
                      {group.items.map((item) => (
                        <Command.Item
                          key={item.href}
                          onSelect={() => handleSelect(item.href)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer transition-all aria-selected:bg-blue-100 dark:aria-selected:bg-blue-500/10 aria-selected:text-blue-600 dark:aria-selected:text-blue-400 group"
                        >
                          <item.icon className="w-4 h-4 text-gray-400 group-aria-selected:text-blue-500" />
                          <span>{item.name}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))}
                </Command.List>

                <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 p-4 bg-gray-50 dark:bg-[#1a1a2e] text-[10px] text-gray-500 dark:text-gray-400">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><span className="px-1 rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-black/30">↑↓</span> {'Move'}</span>
                    <span className="flex items-center gap-1"><span className="px-1 rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-black/30">{'Enter'}</span> {'Select'}</span>
                  </div>
                  <div className="font-mono">{'SecureAuth Workplace'}</div>
                </div>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
