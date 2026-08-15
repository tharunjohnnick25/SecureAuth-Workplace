'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <Card className="w-full max-w-md p-8 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-gray-400 text-sm mb-8">
          You do not have the required permissions to access this resource. 
          If you believe this is an error, please contact your system administrator.
        </p>
        
        <Link href="/dashboard" className="w-full">
          <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10">
            Return to Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  );
}
