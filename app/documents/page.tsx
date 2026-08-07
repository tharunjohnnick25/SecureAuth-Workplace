'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FileText, UploadCloud, ShieldCheck, Loader2, AlertTriangle, File } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useLanguage } from "@/context/LanguageContext";

export default function DocumentsPage() {
    const { t } = useLanguage();
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('Resume');

  const documentTypes = ['Resume', 'Aadhaar/ID', 'PAN', 'Passport', 'Educational Certificates', 'Experience Certificates', 'Other'];

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/documents?userId=${user?.id || 'mock'}`);
      const json = await res.json();
      if(json.success) setDocuments(json.data);
    } catch(err) {
       console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
       toast.error('File exceeds 5MB limit');
       return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedType);
      formData.append('userId', user?.id || 'mock');
      
      const res = await fetch('/api/employee/documents', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if(json.success) {
         toast.success('Document uploaded and sent for verification');
         fetchDocs();
      } else {
         toast.error(json.error);
      }
    } catch(err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">{'My documents'}</h1>
            <p className="text-gray-400">{'Manage your employee documents'}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10 text-center">
                 <div className="w-16 h-16 rounded-full bg-cyan-500/100/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                   <UploadCloud className="w-8 h-8 text-blue-400" />
                 </div>
                 <h3 className="text-xl font-bold mb-2">{'Upload document'}</h3>
                 <p className="text-sm text-gray-400 mb-6">{'Upload PDFs, JPGs, or PNGs'}</p>
                 
                 <div className="text-left mb-6">
                    <label className="text-sm font-semibold text-gray-300 mb-2 block">{'Document type'}</label>
                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full h-10 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                      {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
                 
                 <label className="w-full relative overflow-hidden group cursor-pointer block">
                    <Button type="button" disabled={uploading} className="w-full bg-blue-600 hover:bg-cyan-500/100 pointer-events-none">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Select File'}
                    </Button>
                    <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
                 </label>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10 h-full">
                <h3 className="text-xl font-bold mb-6">{'Document vault'}</h3>
                {loading ? (
                   <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : documents.length === 0 ? (
                   <div className="text-center py-20 text-gray-400">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p>{'No documents uploaded yet'}</p>
                   </div>
                ) : (
                  <div className="space-y-4">
                     {documents.map(doc => (
                       <div key={doc.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                         <div className="flex items-center gap-4">
                           <div className="p-3 bg-white/5 rounded-lg">
                             <File className="w-6 h-6 text-blue-400" />
                           </div>
                           <div>
                             <h4 className="font-semibold text-white">{doc.document_type}</h4>
                             <p className="text-xs text-gray-400">{doc.document_name} • {new Date(doc.created_at).toLocaleDateString()}</p>
                           </div>
                         </div>
                         <div>
                           {doc.is_verified ? (
                             <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/100/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                               <ShieldCheck className="w-3.5 h-3.5" /> {'Verified'}</span>
                           ) : (
                             <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" /> {'Pending verification'}</span>
                           )}
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
