'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Zap, Building2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const plans = [
  {
    id: 'basic',
    name: 'Basic Protection',
    description: 'Essential access management for small teams.',
    price: 49,
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
    price: 199,
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
    price: 499,
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

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planId: string, amount: number) => {
    setLoadingPlan(planId);
    
    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Check your connection.');
        setLoadingPlan(null);
        return;
      }

      // Create Order
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, planId }),
      });

      if (!orderRes.ok) {
        const errorText = await orderRes.text();
        throw new Error(errorText || 'Failed to create payment order');
      }
      
      const order = await orderRes.json();
      
      if (order.error) {
        throw new Error(order.error);
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
        amount: order.amount,
        currency: order.currency,
        name: "SecureAuth SaaS",
        description: `Subscription to ${planId} plan`,
        order_id: order.id,
        handler: async function (response: any) {
          toast.success('Payment verified! Processing subscription...');

          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, planId, amount }),
          });

          if (!verifyRes.ok) {
            const errorText = await verifyRes.text();
            throw new Error(errorText || 'Payment verification failed at server');
          }

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success('Subscription activated successfully!');
            router.push('/dashboard');
          } else {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: "Enterprise Admin",
          email: "admin@company.com",
        },
        theme: {
          color: "#4f46e5",
        },
      };

      if (order.id.includes('mock')) {
        toast.success('Demo mode: Mock payment detected. Simulating success...');
        setTimeout(() => {
          options.handler({
            razorpay_order_id: order.id,
            razorpay_payment_id: `pay_mock_${Math.floor(Math.random() * 1000000)}`,
            razorpay_signature: 'mock_signature'
          });
        }, 1500);
      } else {
        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      }

    } catch (error) {
      console.error(error);
      toast.error('Something went wrong during payment initialization.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Navbar />
      
      <div className="container mx-auto px-6 py-32">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Simple pricing for <span className="text-blue-400 text-glow">Enterprise Security</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400"
          >
            Upgrade your workplace security with AI-driven authentication. Choose the plan that fits your scale.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-panel p-8 relative flex flex-col ${plan.isPopular ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] scale-105 z-10' : 'border-white/10'}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className={`w-12 h-12 ${plan.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                <plan.icon className={`w-6 h-6 ${plan.color}`} />
              </div>
              
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-400 mb-6 h-10">{plan.description}</p>
              
              <div className="mb-8">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-gray-400">/mo</span>
              </div>
              
              <Button 
                onClick={() => handleSubscribe(plan.id, plan.price)}
                disabled={loadingPlan === plan.id}
                className={`w-full h-12 rounded-xl font-bold mb-8 transition-all ${
                  plan.isPopular 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                {loadingPlan === plan.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Subscribe Now'}
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
          ))}
        </div>
      </div>
    </div>
  );
}
