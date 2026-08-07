'use client';

import { useEffect } from 'react';
import { Button } from '@/components/Button';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
    const { t } = useLanguage();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="glass-panel p-10 max-w-md text-center border-red-500/20">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">{'System exception'}</h2>
        <p className="text-gray-400 mb-8 text-sm">
          {'Acriticalerroro'}</p>
        <Button 
          onClick={() => reset()}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
        >
          {'Attempt recovery'}</Button>
      </div>
    </div>
  );
}
