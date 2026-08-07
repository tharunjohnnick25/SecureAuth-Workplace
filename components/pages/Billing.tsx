'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { CreditCard, Download, Calendar } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const invoices = [
  { id: 'INV-2024-04', date: '2026-04-01', amount: '$2,499.00', status: 'Paid' },
  { id: 'INV-2024-03', date: '2026-03-01', amount: '$2,499.00', status: 'Paid' },
  { id: 'INV-2024-02', date: '2026-02-01', amount: '$2,499.00', status: 'Paid' },
];

export function Billing() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold mb-2">{'Billing invoices'}</h1>
            <p className="text-muted-foreground">{'Managebillingin'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{'Invoices'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg bg-input-background/30">
                      <div>
                        <h4 className="font-medium mb-1">{invoice.id}</h4>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{invoice.amount}</span>
                        <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">{invoice.status}</span>
                        <Button variant="outline" size="sm"><Download className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Payment method'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-input-background/30 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">•••• •••• •••• 4242</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('Expires122027_743')}</p>
                </div>
                <Button variant="outline" className="w-full">{'Update payment me'}</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
