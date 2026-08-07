'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Fingerprint, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useBiometrics } from '@/hooks/useBiometrics';
import { useLanguage } from "@/context/LanguageContext";

export default function VerifyBiometricPage() {
    const { t } = useLanguage();
  const router = useRouter();
  const { user, requiresBiometric, setUser, clearBiometricRequirement } = useAuthStore();
  const { authenticateBiometrics } = useBiometrics();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requiresBiometric) {
      router.push('/login');
    }
  }, [requiresBiometric, router]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const success = await authenticateBiometrics(user?.email || '');
      if (success) {
        clearBiometricRequirement();
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 border border-primary/30 animate-pulse">
            <Fingerprint className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold mb-2">{'Biometric verifi'}</h1>
          <p className="text-muted-foreground">
            {'Identityverific'}</p>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-8 text-sm flex items-start gap-3 text-left">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">{'Enhanced securit'}</p>
            <p className="text-muted-foreground">{'Anewdeviceorloc'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full h-14 text-lg gap-2" 
            onClick={handleVerify}
            disabled={loading}
          >
            <Fingerprint className="w-6 h-6" />
            {loading ? 'Verifying...' : 'Authenticate Now'}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push('/login')}
          >
            {'Use different acc'}</Button>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>{'Zero trust archit'}</span>
        </div>
      </Card>
    </div>
  );
}
