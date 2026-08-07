'use client';

import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { motion } from 'framer-motion';
import { Activity, Shield } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

export default function GenericPage({ title, description }: { title: string, description: string }) {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2 text-white">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>

          <Card className="max-w-4xl border-white/5 bg-white/5">
            <CardContent className="p-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                 <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{'Module active'}</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                {'This enterprise module is ready for use. Configure its settings to get started.'}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
