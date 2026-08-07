"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, Send } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CISO at CloudTech',
    content: 'SecureAuthAI reduced our fraudulent login attempts by 94% within the first month. The typing biometrics are a game changer.',
    avatar: 'SC',
  },
  {
    name: 'Marcus Thorne',
    role: 'Head of Security at FinEdge',
    content: 'The integration was seamless. Our users love not having to deal with SMS codes every time they log in from a known device.',
    avatar: 'MT',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Director of IT at GlobalHealth',
    content: 'Zero-trust is finally achievable. The real-time risk scoring gives us confidence in every single authentication event.',
    avatar: 'ER',
  },
];

const Testimonials = () => {
    const { t } = useLanguage();
  return (
    <section className="py-24 bg-slate-900/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">{'Trusted by security leaders'}</h2>
          <p className="text-gray-400">{'Join 500+ enterprises worldwide'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 relative group hover:border-blue-500/30 transition-all"
            >
              <Quote className="absolute top-6 right-8 w-8 h-8 text-blue-500/10 group-hover:text-blue-500/20 transition-colors" />
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <p className="text-gray-300 italic mb-8 leading-relaxed">"{t.content}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white font-bold">{t.name}</div>
                  <div className="text-sm text-gray-500 font-medium">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
    const { t } = useLanguage();
  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="glass-panel max-w-5xl mx-auto overflow-hidden flex flex-col md:flex-row">
          <div className="w-full md:w-2/5 bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white">
            <h2 className="text-3xl font-bold mb-6">{"Let's secure your enterprise"}</h2>
            <p className="text-blue-100 mb-12 leading-relaxed">
              {'Ready to upgrade your identity security?'}</p>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-200">{'Email us'}</div>
                  <div className="font-medium">{'Sales@SecureAuth.com'}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Quote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-200">{'Call us'}</div>
                  <div className="font-medium">{'1-800-SECURE-AI'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-12 bg-slate-950">
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{'First name'}</label>
                  <input type="text" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-blue-500/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{'Last name'}</label>
                  <input type="text" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-blue-500/50 transition-colors" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{'Work email'}</label>
                <input type="email" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-blue-500/50 transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{'Message'}</label>
                <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500/50 transition-colors resize-none"></textarea>
              </div>
              <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">
                {'Send message'}</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Testimonials, Contact };
