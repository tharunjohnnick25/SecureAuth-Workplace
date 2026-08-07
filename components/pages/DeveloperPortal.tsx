'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Code, Book, Key, Zap } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const resources = [
  { title: 'API Documentation', description: 'Complete REST API reference', icon: Code, link: '/api-docs' },
  { title: 'SDK & Libraries', description: 'Client libraries for popular languages', icon: Book, link: '/sdks' },
  { title: 'API Keys', description: 'Manage your API keys', icon: Key, link: '/api-keys' },
  { title: 'Quickstart Guide', description: 'Get started in 5 minutes', icon: Zap, link: '/quickstart' },
];

export function DeveloperPortal() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Developer portal'}</h1>
            <p className="text-muted-foreground">{'Resources and tools'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((resource, idx) => (
              <Card key={idx} className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <resource.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
                      <Button variant="outline" size="sm">{'Learn more'}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
