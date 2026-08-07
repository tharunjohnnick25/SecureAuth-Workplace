'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Shield, Save, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

export default function SecurityPolicyPage() {
    const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState({
    minPasswordLength: 12,
    requireSpecialChar: true,
    requireNumbers: true,
    requireMFA: true,
    sessionTimeoutMins: 30,
    maxFailedAttempts: 5,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API save
    setTimeout(() => {
      setLoading(false);
      toast.success('Security policy updated successfully');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold">{'Security policy configuration'}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{'Define organization-wide security policies'}</p>
            </div>
            <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-cyan-500/100">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {'Save policy'}</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  {'Password requirements'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{'Minimum password length'}</label>
                    <Input 
                      type="number" 
                      value={policy.minPasswordLength} 
                      onChange={e => setPolicy({...policy, minPasswordLength: parseInt(e.target.value)})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-sm font-medium text-white">{'Require special characters'}</h4>
                      <p className="text-xs text-gray-400">{'Force users to include special characters in their passwords'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={policy.requireSpecialChar} onChange={e => setPolicy({...policy, requireSpecialChar: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#0f0f23] after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500/100"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-sm font-medium text-white">{'Require numbers'}</h4>
                      <p className="text-xs text-gray-400">{'Force users to include numbers in their passwords'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={policy.requireNumbers} onChange={e => setPolicy({...policy, requireNumbers: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#0f0f23] after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500/100"></div>
                    </label>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  {'Access session controls'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{'Session timeout (minutes)'}</label>
                    <Input 
                      type="number" 
                      value={policy.sessionTimeoutMins} 
                      onChange={e => setPolicy({...policy, sessionTimeoutMins: parseInt(e.target.value)})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{'Maximum failed login attempts'}</label>
                    <Input 
                      type="number" 
                      value={policy.maxFailedAttempts} 
                      onChange={e => setPolicy({...policy, maxFailedAttempts: parseInt(e.target.value)})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-sm font-medium text-white">{'Require multi-factor authentication'}</h4>
                      <p className="text-xs text-gray-400">{'Mandate MFA/OTP for all admin accounts'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={policy.requireMFA} onChange={e => setPolicy({...policy, requireMFA: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#0f0f23] after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500/100"></div>
                    </label>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
