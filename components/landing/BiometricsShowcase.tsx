"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, MousePointer2, Keyboard, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const BiometricsShowcase = () => {
    const { t } = useLanguage();
  const items = [
    {
      title: 'Device Intelligence',
      description: 'Analyze 100+ hardware and software signals to verify device identity.',
      icon: Smartphone,
      delay: 0,
    },
    {
      title: 'Behavioral Rhythm',
      description: 'Verify identity through unique typing speeds and key-press durations.',
      icon: Keyboard,
      delay: 0.1,
    },
    {
      title: 'Impossible Travel',
      description: 'Detect suspicious logins from geographically distant locations.',
      icon: MapPin,
      delay: 0.2,
    },
    {
      title: 'Interaction Patterns',
      description: 'Analyze mouse movements and scroll behaviors to detect automated bots.',
      icon: MousePointer2,
      delay: 0.3,
    },
  ];

  return (
    <section id="security" className="py-24 bg-slate-900/30">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-white mb-6">{'Beyond simple'}<span className="text-purple-400">{'Passwords'}</span></h2>
          <p className="text-lg text-gray-400">
            {'Secure authentication using AI-powered behavioral biometrics.'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: item.delay }}
              className="flex items-start gap-6 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                <item.icon className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-20 p-8 rounded-[40px] bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-white/10 flex flex-col md:flex-row items-center gap-12 text-center md:text-left"
        >
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-4">{'Zero trust starts here'}</h3>
            <p className="text-gray-400 text-lg">
              {'Our platform integrates seamlessly with your existing identity infrastructure.'}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                   <div className="w-full h-full bg-blue-500/20 flex items-center justify-center">
                     <ShieldCheck className="w-6 h-6 text-blue-400" />
                   </div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-sm text-gray-500 font-semibold uppercase tracking-wider">{'Trusted companies worldwide'}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BiometricsShowcase;
