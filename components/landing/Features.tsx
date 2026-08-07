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
    title: 'Department-Based Access',
    description: 'Easily manage and enforce granular access controls tailored to specific departments and employee roles.',
    icon: Database,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    title: 'Admin Approval Workflow',
    description: 'Streamlined process for IT and HR admins to securely review and approve new employee access requests.',
    icon: ShieldCheck,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  {
    title: 'Office Login Tracking',
    description: 'Monitor daily attendance and real-time employee login activity with geo-fencing and IP verification.',
    icon: Eye,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    title: 'AI Adaptive Authentication',
    description: 'Our risk engine dynamically adjusts MFA challenges based on device trust, location, and behavioral typing.',
    icon: Zap,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
  {
    title: 'Real-Time Threat Dashboard',
    description: 'Unified admin console providing deep insights, live threat alerts, and automated session management.',
    icon: Activity,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
  {
    title: 'Cross-Platform Security',
    description: 'Enterprise-grade protection synchronized instantly across web portals and Android mobile applications.',
    icon: Lock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  {
    title: 'Secure Video Meetings',
    description: 'Host protected virtual meetings with built-in access controls, ensuring only authenticated employees can join.',
    icon: Video,
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
  },
  {
    title: 'Encrypted Company Drive',
    description: 'Share and collaborate on sensitive documents in a unified workspace with zero-trust file access rules.',
    icon: HardDrive,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
  {
    title: 'Enterprise Chat & Comms',
    description: 'Seamlessly communicate with colleagues through secure real-time messaging, channels, and team threads.',
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
