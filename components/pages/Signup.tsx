'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

export function Signup() {
    const { t } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast.success(data.message || 'Access request submitted! Waiting for admin approval.');
      // Keep them on a success screen or redirect to login
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{'Request access'}</h1>
          <p className="text-gray-400 text-center text-sm">
            {'Registerwithyou'}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {formData.email && !formData.email.includes('@') && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive text-center">
              {'Pleaseenteraval'}</div>
          )}
          
          <div>
            <label className="block mb-2 text-sm text-gray-300">{'Full name'}</label>
            <Input
              type="text"
              placeholder="John Doe"
              icon={<User className="w-4 h-4" />}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-gray-300">{'Company email'}</label>
            <Input
              type="email"
              placeholder="employee@company.com"
              icon={<Mail className="w-4 h-4" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-gray-300">{'Password'}</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                icon={<Lock className="w-4 h-4" />}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm text-gray-300">{'Confirm password'}</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              icon={<Lock className="w-4 h-4" />}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all" 
            size="lg" 
            disabled={loading}
          >
            {loading ? 'Submitting Request...' : 'Submit Access Request'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {'Alreadyhaveanac'}{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {'Signin'}</button>
        </div>
      </Card>
    </div>
  );
}
