'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { HelpCircle, Search, Book, Video, MessageSquare } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const categories = [
  { name: 'Getting Started', icon: Book, articles: 12 },
  { name: 'Security Features', icon: HelpCircle, articles: 24 },
  { name: 'API & Integrations', icon: MessageSquare, articles: 18 },
  { name: 'Video Tutorials', icon: Video, articles: 8 },
];

const popularArticles = [
  'How to set up Multi-Factor Authentication',
  'Understanding Security Alerts',
  'API Authentication Guide',
  'Configuring Password Policies',
  'Creating Custom Reports',
];

export function HelpCenter() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Help center'}</h1>
            <p className="text-muted-foreground">{'Findanswersandl'}</p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for help..."
                  className="w-full pl-12 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:border-primary text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {categories.map((category, idx) => (
              <Card key={idx} className="cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <category.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.articles} {'Articles'}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{'Popular articles'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularArticles.map((article, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-primary" />
                      <span>{article}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
