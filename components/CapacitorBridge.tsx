'use client';

import { useEffect } from 'react';
import { setupCapacitorBridge } from '@/lib/capacitor';

export default function CapacitorBridge() {
  useEffect(() => {
    setupCapacitorBridge();
  }, []);
  return null;
}
