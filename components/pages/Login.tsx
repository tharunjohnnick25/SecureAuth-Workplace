'use client';

import { useState } from 'react';
import { Shield, Users, Building2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { AdminLogin } from '@/components/auth/AdminLogin';
import { EmployeeLogin } from '@/components/auth/EmployeeLogin';
import { ManagerLogin } from '@/components/auth/ManagerLogin';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from "@/context/LanguageContext";

type LoginRole = 'admin' | 'manager' | 'employee' | null;

export function Login() {
    const { t } = useLanguage();
  const [role, setRole] = useState<LoginRole>(null);

  if (role === 'admin') {
    return (
      <div className="relative z-10 w-full">
        <button 
          onClick={() => setRole(null)}
          className="absolute -top-12 left-4 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {'Back to role selection'}</button>
        <AdminLogin />
      </div>
    );
  }

  if (role === 'manager') {
    return (
      <div className="relative z-10 w-full">
        <button 
          onClick={() => setRole(null)}
          className="absolute -top-12 left-4 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {'Back to role selection'}</button>
        <ManagerLogin />
      </div>
    );
  }

  if (role === 'employee') {
    return (
      <div className="relative z-10 w-full">
        <button 
          onClick={() => setRole(null)}
          className="absolute -top-12 left-4 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {'Back to role selection'}</button>
        <EmployeeLogin />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 p-4 md:p-8 border border-white/10 bg-[#0a0a16]/80 backdrop-blur-xl mx-4 md:mx-0">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
            <img src="/logo.jpg" alt="SecureAuth Workplace Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-white">{'Welcome back'}</h1>
          <p className="text-gray-400 text-center text-sm">
            {'Select your role to continue'}</p>
        </div>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('admin')}
            className="w-full p-4 rounded-xl border border-white/10 hover:border-purple-500/50 bg-white/5 hover:bg-purple-500/10 transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <Building2 className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-white">{'Company admin'}</h3>
              <p className="text-xs text-gray-400">{'Manage employees and security settings'}</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('manager')}
            className="w-full p-4 rounded-xl border border-white/10 hover:border-emerald-500/50 bg-white/5 hover:bg-emerald-500/10 transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-white">{'Department Manager'}</h3>
              <p className="text-xs text-gray-400">{'Manage department employees and access apps'}</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('employee')}
            className="w-full p-4 rounded-xl border border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-cyan-500/10 transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-white">{'Employee'}</h3>
              <p className="text-xs text-gray-400">{'Access workplace applications securely'}</p>
            </div>
          </motion.button>


        </div>
      </Card>
    </div>
  );
}
