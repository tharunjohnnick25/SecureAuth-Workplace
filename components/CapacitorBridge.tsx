'use client';

import { useEffect } from 'react';
import { setupCapacitorBridge, isRunningInCapacitor } from '@/lib/capacitor';

export default function CapacitorBridge() {
  useEffect(() => {
    setupCapacitorBridge();
  }, []);

  useEffect(() => {
    if (!isRunningInCapacitor()) return;

    const handleOnline = () => document.dispatchEvent(new CustomEvent('capacitor:online'));
    const handleOffline = () => document.dispatchEvent(new CustomEvent('capacitor:offline'));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
