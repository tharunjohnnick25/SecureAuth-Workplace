'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { MessageSquare, Plus, Clock } from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const tickets = [
  { id: 'TICK-2024-089', subject: 'Unable to access API documentation', status: 'Open', priority: 'Medium', created: '2026-04-30', updated: '2 hours ago' },
  { id: 'TICK-2024-088', subject: 'MFA setup issues', status: 'In Progress', priority: 'High', created: '2026-04-29', updated: '1 day ago' },
  { id: 'TICK-2024-087', subject: 'Feature request: Custom dashboard widgets', status: 'Resolved', priority: 'Low', created: '2026-04-25', updated: '3 days ago' },
];

export function SupportTickets() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Support tickets'}</h1>
              <p className="text-muted-foreground">{'Viewandmanageyo'}</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {'New ticket'}</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {'Your tickets'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{ticket.id}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            ticket.status === 'Open' ? 'bg-warning/20 text-warning' :
                            ticket.status === 'In Progress' ? 'bg-primary/20 text-primary' :
                            'bg-success/20 text-success'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            ticket.priority === 'High' ? 'bg-destructive/20 text-destructive' :
                            ticket.priority === 'Medium' ? 'bg-warning/20 text-warning' :
                            'bg-primary/20 text-primary'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{ticket.subject}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{'Created'}{ticket.created}</span>
                          </div>
                          <span>{'Updated'}{ticket.updated}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">{'View'}</Button>
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
