'use client';

import { Bell, Menu, X, Shield } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalSearch } from './SearchCommand';
import { NotificationCenter } from './notifications/NotificationCenter';
import { SidebarContent } from './Sidebar';
import { MobileNav } from './MobileNav';
import { LanguageSelector } from './LanguageSelector';

export function Navbar() {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const unreadCount = 3;

  return (
    <>
      <motion.header 
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-[#020617] border-b border-white/10 z-[50]"
      >
        <div className="flex items-center h-full px-4 lg:px-6 gap-3">
          {/* Left: Hamburger only */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button 
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Identity Badge (Desktop) */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">SA</div>
               <div className="hidden md:block">
                  <div className="text-[10px] font-bold text-white leading-none">Security Admin</div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-tighter mt-1">Verified Node</div>
               </div>
            </div>

            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 hover:bg-white/5 rounded-xl transition-colors group"
            >
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:rotate-12 transition-transform" />
              {unreadCount > 0 && (
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
