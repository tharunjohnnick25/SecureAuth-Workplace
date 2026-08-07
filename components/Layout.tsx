'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  FileText,
  Lock,
  Bell,
  Settings,
  AlertTriangle,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { ChatAssistant } from './ai/ChatAssistant';
import { useLanguage } from "@/context/LanguageContext";

export function Layout({ children }: { children: React.ReactNode }) {
    const { t } = useLanguage();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/users", label: "Users", icon: Users },
    { path: "/access-control", label: "Access Control", icon: Shield },
    { path: "/authentication", label: "Authentication", icon: Key },
    { path: "/audit-logs", label: "Audit Logs", icon: FileText },
    { path: "/security-policies", label: "Security Policies", icon: Lock },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">{'Enterprise iam'}</h1>
            <p className="text-xs text-gray-500">{'Security managem'}</p>
          </div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="p-4 space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-900 uppercase">{'System status'}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-3">
            <span className="text-green-600">{'Security score'}</span>
            <span className="font-bold text-green-700">94/100</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 bg-white border-b border-gray-200 sticky top-0 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">{'Secure auth'}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-gray-200 bg-white h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-screen w-80 bg-white z-[101] lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-gray-200 sticky top-0 z-40 items-center justify-between px-8">
           <div className="text-sm font-medium text-gray-500">{'Security managem'}</div>
           <div className="flex items-center gap-6">
              <button className="relative p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                 <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">{'Sa'}</div>
                 <div>
                    <div className="text-xs font-bold text-gray-900">{'Security admin'}</div>
                    <div className="text-[10px] text-gray-500">{'Adminenterprise'}</div>
                 </div>
              </div>
           </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      <ChatAssistant />
    </div>
  );
}
