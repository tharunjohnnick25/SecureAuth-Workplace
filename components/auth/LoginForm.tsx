'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
    const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser, setRequiresBiometric } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Sign-in failed. Please check your credentials and try again.');
      }

      if (result.requiresMfa || result.requiresBiometric) {
        setRequiresBiometric(true, result.riskLevel);
        router.push('/mfa-verify');
      } else {
        setUser(result.user);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md p-8 glass-panel"
    >
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[var(--color-cyber-blue)]/20 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-[var(--color-cyber-blue)]" />
        </div>
        <h2 className="text-3xl font-bold text-white text-glow">{'Secure login'}</h2>
        <p className="text-gray-400 mt-2 text-sm">{'Adaptive risk bas'}</p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{'Email'}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('email')}
              type="email"
              className="w-full pl-10 pr-4 py-3 glass-input text-sm"
              placeholder="admin@cybersec.io"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{'Password'}</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('password')}
              type="password"
              className="w-full pl-10 pr-4 py-3 glass-input text-sm"
              placeholder="••••••••••••"
            />
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 btn-cyber flex items-center justify-center"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </motion.div>
  );
}
