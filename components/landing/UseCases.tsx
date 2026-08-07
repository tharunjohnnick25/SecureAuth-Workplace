"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Landmark, Stethoscope, Briefcase, Users, Laptop } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const useCases = [
  {
    title: 'Corporate Offices',
    description: 'Manage physical and digital access for thousands of employees across multiple locations with geo-fencing and device trust.',
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-400'
  },
  {
    title: 'Banking & Finance',
    description: 'Protect sensitive financial data with military-grade behavioral biometrics and strict zero-trust authentication workflows.',
    icon: Landmark,
    gradient: 'from-purple-500 to-indigo-400'
  },
  {
    title: 'Healthcare Providers',
    description: 'Ensure HIPAA compliance with secure, fast login methods that verify medical staff identity without slowing down patient care.',
    icon: Stethoscope,
    gradient: 'from-emerald-500 to-teal-400'
  },
  {
    title: 'HR Management',
    description: 'Automate onboarding access approvals and securely offboard exiting employees with one-click credential revocation.',
    icon: Users,
    gradient: 'from-orange-500 to-amber-400'
  },
  {
    title: 'IT & Tech Enterprises',
    description: 'Safeguard internal developer portals, AWS environments, and production databases behind a unified AI access gateway.',
    icon: Briefcase,
    gradient: 'from-rose-500 to-pink-400'
  },
  {
    title: 'Remote Workforce',
    description: 'Verify the identity of remote workers continuously through typing analysis, regardless of their IP address or location.',
    icon: Laptop,
    gradient: 'from-blue-600 to-indigo-600'
  }
];

const UseCases = () => {
    const { t } = useLanguage();
  return (
    <section className="py-24 bg-[#020617] relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            {'Builtfor'}<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{'Every enterprise'}</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400"
          >
            {'Whethermanaging'}</motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-panel p-8 group overflow-hidden relative"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${useCase.gradient} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>
              
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br ${useCase.gradient} bg-opacity-20`}>
                <useCase.icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">{useCase.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
