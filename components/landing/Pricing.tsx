"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

const Pricing = () => {
  const { t } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const tiers = [
    {
      name: 'Starter',
      monthlyPrice: '₹0',
      yearlyPrice: '₹0',
      description: 'Perfect for small teams and developers.',
      features: [
        'Up to 1,000 MAU',
        'Basic Device Fingerprinting',
        'Standard MFA (OTP/SMS)',
        'Community Support',
      ],
      buttonText: 'Get Started',
      href: '/login',
      popular: false,
    },
    {
      name: 'Professional',
      monthlyPrice: '₹3,999',
      yearlyPrice: '₹3,199',
      description: 'Advanced security for growing businesses.',
      features: [
        'Up to 10,000 MAU',
        'AI Risk-Based Auth',
        'Behavioral Biometrics',
        'Impossible Travel Detection',
        'Priority Email Support',
      ],
      buttonText: 'Try Pro Free',
      href: '/login',
      popular: true,
    },
    {
      name: 'Enterprise',
      monthlyPrice: '₹14,999',
      yearlyPrice: '₹11,999',
      description: 'Scale without limits and dedicated security.',
      features: [
        'Unlimited MAU',
        'Custom AI Training',
        'SAML / OIDC Integration',
        'Dedicated Account Manager',
        '24/7 Phone & Slack Support',
        'On-Premise Deployment',
      ],
      buttonText: 'Contact Sales',
      href: '#contact',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
       {/* Background Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/5 blur-[120px] -z-10"></div>

      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">{t('pricingTitle')}</h2>
          <p className="text-lg text-gray-400 mb-8">
            {t('pricingDesc')}
          </p>

          {/* Billing Cycle Selector */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('monthly')}
            </button>

            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>{t('yearly')}</span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                {t('save20')}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {tiers.map((tier, i) => {
            const priceDisplay = billingCycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative glass-panel p-8 flex flex-col ${
                  tier.popular ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest border border-white/20 shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-300" /> {t('mostPopular')}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">{priceDisplay}</span>
                    {priceDisplay !== 'Custom' && <span className="text-gray-500 font-medium">{t('perMonth')}</span>}
                  </div>
                  {billingCycle === 'yearly' && priceDisplay !== 'Custom' && priceDisplay !== '₹0' && (
                    <span className="text-xs font-semibold text-green-400">{'Save 20% with annual billing'}</span>
                  )}
                  <p className="text-gray-400 text-sm mt-2">{tier.description}</p>
                </div>

                <div className="flex-1 mb-8">
                  <ul className="space-y-4">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link 
                  href={tier.href}
                  className={`w-full py-4 rounded-xl font-bold text-center transition-all ${
                    tier.popular 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {tier.buttonText}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise Callout */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-300 text-sm font-medium">
             <Shield className="w-4 h-4" />
             {'Need a custom solution?'}<Link href="#contact" className="underline font-bold ml-1">{'Contact our team'}</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
