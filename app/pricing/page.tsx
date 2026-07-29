'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Zap, Building2, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function PricingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'basic',
      name: 'Basic Protection',
      description: 'Essential access management for small teams.',
      monthlyPrice: 3999,
      yearlyPrice: 3199, // ₹3,199/mo (billed ₹38,388/yr)
      yearlyTotal: 38388,
      icon: Shield,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      features: [
        'Up to 50 employees',
        'Basic Email OTP MFA',
        'Admin Dashboard',
        'Standard Support',
        '7-day logs retention'
      ],
      missing: ['AI Risk Scoring', 'Device Fingerprinting', 'Custom Branding']
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'Advanced security with AI threat detection.',
      monthlyPrice: 14999,
      yearlyPrice: 11999, // ₹11,999/mo (billed ₹143,988/yr)
      yearlyTotal: 143988,
      isPopular: true,
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      features: [
        'Up to 500 employees',
        'Advanced MFA',
        'AI Risk Scoring',
        'Device Fingerprinting',
        '30-day logs retention',
        'Priority Support'
      ],
      missing: ['Custom Branding']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Complete zero-trust architecture for corporations.',
      monthlyPrice: 39999,
      yearlyPrice: 31999, // ₹31,999/mo (billed ₹383,988/yr)
      yearlyTotal: 383988,
      icon: Building2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      features: [
        'Unlimited employees',
        'Custom MFA Policies',
        'Real-time Threat Alerts',
        'API Access',
        '1-year logs retention',
        '24/7 Dedicated Support',
        'Custom Branding'
      ],
      missing: []
    }
  ];

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan: any) => {
    const isYearly = billingCycle === 'yearly';
    const amount = isYearly ? plan.yearlyTotal : plan.monthlyPrice;
    const planId = `${plan.id}_${billingCycle}`;

    setLoadingPlan(plan.id);
    
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error('Razorpay SDK failed to load. Please check internet connection.');
        setLoadingPlan(null);
        return;
      }

      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, planId, currency: 'INR', billingCycle }),
      });

      const order = await orderRes.json().catch(() => ({}));

      if (!orderRes.ok || order.error) {
        toast.error(order.error || 'Please set your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local');
        setLoadingPlan(null);
        return;
      }

      const options: any = {
        key: order.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'SecureAuth Cybersecurity',
        description: `Subscription to ${plan.name} (${billingCycle.toUpperCase()})`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            toast.loading('Verifying payment signature...', { id: 'razorpay-verify' });

            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                planId: plan.id,
                amount,
                billingCycle,
                currency: 'INR'
              }),
            });

            toast.dismiss('razorpay-verify');

            if (!verifyRes.ok) {
              const errorData = await verifyRes.json().catch(() => ({}));
              throw new Error(errorData.error || errorData.message || 'Payment verification failed');
            }

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success(`Subscription to ${plan.name} (${billingCycle}) activated!`);
              router.push('/dashboard');
            } else {
              toast.error(verifyData.message || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            toast.dismiss('razorpay-verify');
            toast.error(verifyErr?.message || 'Error processing payment verification');
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Razorpay payment checkout closed.');
            setLoadingPlan(null);
          },
        },
        prefill: {
          name: 'Enterprise Admin',
          email: 'admin@company.com',
          contact: '9999999999',
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const RazorpayConstructor = (window as any).Razorpay;
      if (!RazorpayConstructor) {
        throw new Error('Razorpay SDK constructor not found');
      }

      const paymentObject = new RazorpayConstructor(options);
      paymentObject.open();

    } catch (error: any) {
      console.error('Razorpay Checkout error:', error);
      toast.error(error?.message || 'Something went wrong during payment initialization.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-y-auto">
      <Navbar />
      
      <div className="container mx-auto px-6 py-28">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            {t('pricingTitle')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400 mb-10"
          >
            {t('pricingDesc')}
          </motion.p>

          {/* Billing Cycle Toggle */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            const isYearly = billingCycle === 'yearly';
            const priceVal = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const formattedPrice = `₹${priceVal.toLocaleString('en-IN')}`;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-panel p-8 relative flex flex-col ${plan.isPopular ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] scale-105 z-10' : 'border-white/10'}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-300" /> {t('mostPopular')}
                  </div>
                )}
                
                <div className={`w-12 h-12 ${plan.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                  <plan.icon className={`w-6 h-6 ${plan.color}`} />
                </div>
                
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-400 mb-6 h-10">{plan.description}</p>
                
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formattedPrice}</span>
                    <span className="text-gray-400">{t('perMonth')}</span>
                  </div>
                  {isYearly && (
                    <div className="text-xs text-green-400 font-semibold mt-1">
                      Billed ₹{plan.yearlyTotal.toLocaleString('en-IN')} / year (Save 20%)
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => handleSubscribe(plan)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full h-12 rounded-xl font-bold mb-8 transition-all ${
                    plan.isPopular 
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {loadingPlan === plan.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('subscribeNow')}
                </Button>
                
                <div className="space-y-4 flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Included Features</p>
                  {plan.features.map(feature => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                  {plan.missing.map(feature => (
                    <div key={feature} className="flex items-start gap-3 opacity-40">
                      <X className="w-5 h-5 text-gray-500 shrink-0" />
                      <span className="text-sm text-gray-500">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
