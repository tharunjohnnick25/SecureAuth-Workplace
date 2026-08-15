"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Fingerprint, Lock, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from "@/context/LanguageContext";

const Hero = () => {
    const { t } = useLanguage();
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-pulse transition-delay-1000"></div>

      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 mb-8"
          >
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">{'New AI-powered offering'}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight"
          >
            {'Intelligent '}<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{'Access & Workplace'}</span> {' Management'}</motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl"
          >
            {'Protect your entire workforce with AI-driven access security and seamless collaboration tools.'}</motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-16"
          >
            <Link 
              href="/login" 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2"
            >
              {'Start free trial'}<ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/demo" 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all backdrop-blur-sm"
            >
              {'Watch live demo'}</Link>
          </motion.div>

          {/* Dashboard Preview Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-5xl mx-auto"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative glass-panel p-2 md:p-4 overflow-hidden">
              {/* Inner Dashboard UI Mockup */}
              <div className="bg-slate-950 rounded-xl overflow-hidden border border-white/10 aspect-[16/9] flex flex-col">
                <div className="h-12 border-b border-white/10 flex items-center px-4 gap-4 bg-slate-900/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <div className="flex-1 h-6 bg-slate-800 rounded-md max-w-sm mx-auto flex items-center px-3">
                    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-blue-500"></div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex p-4 gap-4">
                  <div className="w-1/4 flex flex-col gap-4">
                    <div className="h-32 bg-slate-900/50 rounded-lg border border-white/5 p-4 flex flex-col gap-2">
                      <div className="w-12 h-2 bg-blue-500/20 rounded"></div>
                      <div className="text-2xl font-bold text-white">99.9%</div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-green-500"></div>
                      </div>
                    </div>
                    <div className="h-full bg-slate-900/50 rounded-lg border border-white/5"></div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex-1 bg-slate-900/50 rounded-lg border border-white/5 relative overflow-hidden">
                       {/* Animated Wave or Graph */}
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Zap className="w-16 h-16 text-blue-500/20 animate-pulse" />
                       </div>
                    </div>
                    <div className="h-24 flex gap-4">
                       <div className="flex-1 bg-slate-900/50 rounded-lg border border-white/5"></div>
                       <div className="flex-1 bg-slate-900/50 rounded-lg border border-white/5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Auth Indicators */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -top-12 -left-8 glass-panel p-4 hidden md:flex items-center gap-3 shadow-blue-500/10"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="text-green-400 w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{'Auth status'}</div>
                <div className="text-sm font-bold text-white">{'Verified low risk'}</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="absolute -bottom-8 -right-8 glass-panel p-4 hidden md:flex items-center gap-3 shadow-purple-500/10"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Fingerprint className="text-blue-400 w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{'Biometric match'}</div>
                <div className="text-sm font-bold text-white">{'Typing Profile 98%'}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
