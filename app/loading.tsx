'use client';

import { Shield, Loader2 } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

export default function Loading() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-cyber-dark)] overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--color-cyber-blue)] opacity-[0.03] rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600 opacity-[0.03] rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="z-10 flex flex-col items-center animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <img src="/logo.jpg" alt="SecureAuth Workplace Logo" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -inset-2 bg-[var(--color-cyber-blue)]/20 blur-xl rounded-full animate-pulse"></div>
        </div>
        
        <h2 className="text-2xl font-bold text-white tracking-widest mb-2">SecureAuth Workplace</h2>
        <div className="flex items-center gap-3 text-gray-400">
           <Loader2 className="w-4 h-4 animate-spin text-[var(--color-cyber-blue)]" />
           <span className="text-xs uppercase font-bold tracking-[0.3em] animate-pulse">{'Initializing vir'}</span>
        </div>
      </div>

      <div className="fixed bottom-8 left-0 right-0 px-8">
         <div className="max-w-xs mx-auto space-y-2">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-[var(--color-cyber-blue)] w-1/3 animate-[progress_2s_infinite_ease-in-out]"></div>
            </div>
            <div className="flex justify-between text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
               <span>{'Loading kernel'}</span>
               <span>{'Verifying state'}</span>
            </div>
         </div>
      </div>
    </div>
  );
}
