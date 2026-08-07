"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Send, Shield } from 'lucide-react';

const GithubIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.03c3.15-.38 6.5-1.4 6.5-7.17a5.2 5.2 0 0 0-1.5-3.8c.16-.4.65-2-.15-4.5 0 0-1.2-.38-3.9 1.4a13.3 13.3 0 0 0-7 0C6.2 2.72 5 3.1 5 3.1c-.8 2.5-.3 4.1-.15 4.5A5.2 5.2 0 0 0 3.5 11.4c0 5.77 3.35 6.79 6.5 7.17A4.8 4.8 0 0 0 9 21.6V22"></path></svg>;
const TwitterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>;
const LinkedinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
import Link from 'next/link';
import { useLanguage } from "@/context/LanguageContext";

const faqs = [
  {
    question: "What is AI-driven adaptive authentication?",
    answer: "It's a security approach where the system dynamically adjusts authentication requirements based on real-time risk scores. If a login attempt looks suspicious (e.g., unusual device or location), the system might ask for an extra MFA factor."
  },
  {
    question: "How does behavioral typing biometrics work?",
    answer: "Our system analyzes the unique rhythm, speed, and pressure of how you type. Every person has a distinct 'typing fingerprint' that is extremely difficult for bots or hackers to replicate."
  },
  {
    question: "Is SecureAuthAI compliant with GDPR and SOC2?",
    answer: "Yes, our platform is designed with a privacy-first approach and complies with major global security standards including GDPR, SOC2, and HIPAA."
  },
  {
    question: "Can I integrate this with my existing SSO provider?",
    answer: "Absolutely. SecureAuthAI seamlessly integrates with Okta, Azure AD, Auth0, and any SAML or OIDC compliant identity provider."
  }
];

const LandingFooter = () => {
    const { t } = useLanguage();
  return (
    <footer className="bg-slate-950 pt-20 pb-10 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 overflow-hidden flex items-center justify-center shrink-0">
                <img src="/new-logo.png" alt="SecureAuth Workplace Logo" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                SecureAuth Workplace
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              {'Securing the future of authentication.'}</p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <TwitterIcon />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <LinkedinIcon />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <GithubIcon />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{'Product'}</h4>
            <ul className="space-y-4 text-sm text-gray-400 font-medium">
              <li><Link href="#" className="hover:text-blue-400">{'Features'}</Link></li>
              <li><Link href="#" className="hover:text-blue-400">{'Biometrics'}</Link></li>
              <li><Link href="#" className="hover:text-blue-400">{'Adaptive auth'}</Link></li>
              <li><Link href="#" className="hover:text-blue-400">{'Risk engine'}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{'Company'}</h4>
            <ul className="space-y-4 text-sm text-gray-400 font-medium">
              <li><Link href="#about" className="hover:text-blue-400">{'About us'}</Link></li>
              <li><Link href="#contact" className="hover:text-blue-400">{'Contact us'}</Link></li>
              <li><Link href="#pricing" className="hover:text-blue-400">{'Subscription plans'}</Link></li>
              <li><Link href="#" className="hover:text-blue-400">{'Security blog'}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{'Stay protected'}</h4>
            <p className="text-gray-400 text-sm mb-4">{'Subscribe to our security newsletter'}</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="email@company.com" 
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-blue-500/50 transition-colors"
              />
              <button className="absolute right-2 top-1.5 h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500 font-medium">
          <div>&copy; 2024 SecureAuth Workplace Inc. All rights reserved.</div>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-white transition-colors">{'Privacy policy'}</Link>
            <Link href="#" className="hover:text-white transition-colors">{'Terms of Service'}</Link>
            <Link href="#" className="hover:text-white transition-colors">{'Cookie policy'}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FAQ = () => {
    const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-slate-950/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">{'Frequently asked questions'}</h2>
          <p className="text-gray-400">{'Everything you need to know about SecureAuth Workplace'}</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-panel overflow-hidden">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <span className="font-bold text-white pr-4">{faq.question}</span>
                {openIndex === i ? <Minus className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-gray-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFooter;
export { FAQ, LandingFooter };
