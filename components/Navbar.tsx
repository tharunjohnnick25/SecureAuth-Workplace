'use client';

import { Bell, Menu, X, Shield, ChevronDown, User, Settings, LogOut, Moon, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalSearch } from './SearchCommand';
import { NotificationCenter } from './notifications/NotificationCenter';
import { SidebarContent } from './Sidebar';
import { MobileNav } from './MobileNav';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Navbar() {
  const { t } = useLanguage();
  const { user, setUser } = useAuthStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const router = useRouter();
  const unreadCount = 3;

  const handleLogout = async () => {
    try {
      await fetch('/api/attendance/checkout', { method: 'POST' }).catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('secureauth-session');
      }
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <motion.header 
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-[#020617] border-b border-white/10 z-[50]"
      >
        <div className="flex items-center h-full px-4 lg:px-6 gap-3">
          {/* Left: Hamburger and Back Button */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2 ml-2">
              <div className="w-8 h-8 overflow-hidden flex items-center justify-center shrink-0">
                <img src="/new-logo.png" alt="SecureAuth Workplace Logo" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <span className="font-semibold text-white truncate text-lg">SecureAuth</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Identity Badge (Desktop) */}
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                 {user?.profile_picture ? (
                   <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-black flex-shrink-0">
                     <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                   </div>
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                     {user?.full_name?.charAt(0) || 'U'}
                   </div>
                 )}
                 <div className="hidden md:flex flex-col items-start text-left">
                    <div className="text-[10px] font-bold text-white leading-none">{user?.full_name || 'My Profile'}</div>
                    <div className="text-[8px] text-gray-500 uppercase tracking-tighter mt-1">{user?.role || 'USER'}</div>
                 </div>
                 <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-[#0f111a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-white/5">
                        <p className="text-sm font-medium text-white truncate">{user?.full_name || 'My Profile'}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email || 'No email provided'}</p>
                      </div>
                      <div className="p-1.5">
                        <button onClick={() => { setIsProfileOpen(false); router.push('/profile'); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                          <User className="w-4 h-4" />
                          View Profile
                        </button>
                        <button onClick={() => { setIsProfileOpen(false); router.push('/settings'); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                      </div>
                      <div className="p-1.5 border-t border-white/5">
                        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`relative p-2.5 rounded-xl transition-colors group mr-1 flex items-center gap-2 ${isFocusMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-white/5 text-gray-400'}`}
              title="Focus Mode (Hide Notifications)"
            >
              <Moon className={`w-5 h-5 transition-transform ${isFocusMode ? 'fill-indigo-400' : 'group-hover:text-white'}`} />
              {isFocusMode && <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Focus</span>}
            </button>
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 hover:bg-white/5 rounded-xl transition-colors group"
            >
              <Bell className={`w-5 h-5 transition-transform ${isFocusMode ? 'text-gray-600 opacity-50' : 'text-gray-400 group-hover:text-white group-hover:rotate-12'}`} />
              {unreadCount > 0 && !isFocusMode && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              )}
            </button>
            <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
          </div>
        </div>
      </motion.header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-screen w-[280px] bg-[#020617] border-r border-white/10 z-[60] lg:hidden shadow-2xl"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </>
  );
}
