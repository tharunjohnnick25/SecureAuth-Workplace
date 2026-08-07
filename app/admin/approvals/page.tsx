'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Check, X, FileText, User, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

type ApprovalRequest = {
  id: string;
  employeeName: string;
  type: 'Profile Update' | 'Document Verification' | 'Leave Request' | 'Device Registration';
  details: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: string;
  riskLevel: 'Low' | 'Medium' | 'High';
};

const mockApprovals: ApprovalRequest[] = [
  { id: '1', employeeName: 'Sarah Chen', type: 'Profile Update', details: 'Changed Emergency Contact', status: 'Pending', timestamp: '10 mins ago', riskLevel: 'Low' },
  { id: '2', employeeName: 'Marcus Thorne', type: 'Document Verification', details: 'Uploaded Passport for verification', status: 'Pending', timestamp: '1 hour ago', riskLevel: 'Medium' },
  { id: '3', employeeName: 'John Doe', type: 'Device Registration', details: 'New mobile device added from unusual location', status: 'Pending', timestamp: '2 hours ago', riskLevel: 'High' },
];

export default function ApprovalsPage() {
    const { t } = useLanguage();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(mockApprovals);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setApprovals(prev => prev.filter(a => a.id !== id));
    toast.success(`Request ${action}d successfully`);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'Profile Update': return <User className="w-5 h-5 text-blue-400" />;
      case 'Document Verification': return <FileText className="w-5 h-5 text-purple-400" />;
      case 'Leave Request': return <Calendar className="w-5 h-5 text-green-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'High': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{'Approval hub'}</h1>
            <p className="text-gray-400">{'Manage employees'}</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {approvals.length === 0 ? (
              <Card className="glass-panel p-12 flex flex-col items-center justify-center text-center">
                <Check className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">{'All caught up'}</h3>
                <p className="text-gray-400">{'There are no pending approvals'}</p>
              </Card>
            ) : (
              approvals.map(approval => (
                <Card key={approval.id} className="glass-panel p-6 overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors" />
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pl-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        {getIcon(approval.type)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-white">{approval.employeeName}</h3>
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {approval.timestamp}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-blue-400">{approval.type}</span>
                          <span className="text-gray-600">•</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getRiskColor(approval.riskLevel)}`}>
                            {approval.riskLevel} {'Risk'}</span>
                        </div>
                        
                        <p className="text-sm text-gray-400">{approval.details}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                      <button 
                        onClick={() => handleAction(approval.id, 'reject')}
                        className="flex-1 md:flex-none px-4 py-2 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> {'Reject'}</button>
                      <button 
                        onClick={() => handleAction(approval.id, 'approve')}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> {'Approve'}</button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
