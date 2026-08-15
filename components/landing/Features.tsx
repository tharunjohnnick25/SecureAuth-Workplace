"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  Globe, 
  Activity, 
  Zap, 
  Lock, 
  Eye,
  Video,
  HardDrive,
  MessageSquare
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const features = [
  {
    title: 'Face Authentication & Passkeys',
    description: 'Secure, passwordless login using advanced facial recognition and FIDO2 passkeys for maximum security.',
    icon: ShieldCheck,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    title: 'Role-Based Governance',
    description: 'Dynamic dashboards that automatically adapt to Admin, Manager, and Employee perspectives with exportable PDF/Excel reports.',
    icon: Activity,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  {
    title: 'Shift & Leave Management',
    description: 'Comprehensive roster tools and a strict two-step leave approval hierarchy (Manager -> Admin) to ensure coverage.',
    icon: Cpu,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    title: 'Office Resource Requests',
    description: 'Centralized IT and facility resource request portal with strict Admin-only approval workflows.',
    icon: Zap,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  {
    title: '1-on-1 Meeting Sync',
    description: 'Dedicated manager tools to log 1-on-1 meetings, automatically syncing actionable goals directly to employee task boards.',
    icon: Eye,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
  {
    title: 'Personal Encrypted Vault',
    description: 'Zero-trust file storage for every employee to securely store and access sensitive personal and corporate documents.',
    icon: Lock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  {
    title: 'Centralized Task Board',
    description: 'Unified workspace for employees to track assignments, and for managers to monitor team progress and delegate work.',
    icon: Database,
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
  },
  {
    title: 'Employee Directory',
    description: 'A searchable organization chart to quickly find colleagues, view their status, and understand reporting structures.',
    icon: Globe,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
  {
    title: 'Automated Notifications',
    description: 'Real-time alerts for pending approvals, task assignments, and security events keeping the whole team synchronized.',
    icon: MessageSquare,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
  },
];

const Features = () => {
    const { t } = useLanguage();
  return (
    <section id="features" className="py-24 bg-slate-950/50 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            {'Security & Workplace features for '}<span className="text-blue-400 text-glow">{'Modern enterprises'}</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400"
          >
            {'Deploy enterprise-grade security in minutes.'}</motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="glass-panel p-8 hover:border-blue-500/30 transition-all cursor-pointer group"
            >
              <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
