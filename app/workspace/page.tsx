'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, HardDrive, File, Folder, Download, Trash2, Upload, AlertCircle, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function WorkspacePage() {
  const { user } = useAuthStore();
  const [files, setFiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Storage (Max 1GB)
  const MAX_STORAGE = 1024 * 1024 * 1024; // 1 GB
  const usedStorage = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const storagePercentage = (usedStorage / MAX_STORAGE) * 100;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [filesRes, reqRes] = await Promise.all([
        fetch(`/api/drive/files?user_id=${user?.id}&role=${user?.role}`, { cache: 'no-store' }),
        fetch(`/api/drive/requests`, { cache: 'no-store' })
      ]);
      const filesData = await filesRes.json();
      const reqData = await reqRes.json();
      
      if (filesData.success) setFiles(filesData.data);
      if (reqData.success) {
        if (user?.role === 'ADMIN') {
          setRequests(reqData.data);
        } else {
          setRequests(reqData.data.filter((r: any) => r.user_id === user?.id));
        }
      }
    } catch (e) {
      toast.error('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/drive/auth';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
      let filePath = 'mock_path';
      
      if (!isMock && user) {
        const supabase = createClient();
        filePath = `${user.id}/${Date.now()}_${file.name}`;
        
        // Direct upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('employee-documents')
          .upload(filePath, file, {
            upsert: false
          });
          
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Send metadata to API
      const res = await fetch('/api/drive/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user?.id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileUrl: filePath,
          isConfidential: false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('File uploaded to workspace');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/drive/files/${fileId}?user_id=${user?.id}&role=${user?.role}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('File deleted');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const handleRequestAccess = async (file: any) => {
    try {
      const res = await fetch('/api/drive/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          user_name: user?.full_name,
          file_id: file.id,
          file_name: file.name,
          reason: 'Need access for current project'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Access request submitted');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit request');
    }
  };

  const handleApproveRequest = async (reqId: string, status: string) => {
    try {
      const res = await fetch('/api/drive/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: reqId, status, admin_id: user?.id })
      });
      if (!res.ok) throw new Error('Failed to update request');
      toast.success(`Request ${status.toLowerCase()}`);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 pb-24 lg:pb-0 font-sans">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
                <HardDrive className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" /> 
                Workspace
              </h1>
              <p className="text-gray-400 text-sm sm:text-base font-medium">Secure Google Drive Integration</p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {user?.role === 'ADMIN' && (
                <Button onClick={handleConnectGoogle} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 w-full sm:w-auto py-6 sm:py-2 rounded-2xl sm:rounded-xl shadow-sm backdrop-blur-md transition-all">
                  Connect Drive
                </Button>
              )}
              <div>
                <input type="file" id="drive-upload" className="hidden" onChange={handleUpload} disabled={uploading} />
                <label htmlFor="drive-upload" className="w-full sm:w-auto">
                  <div className={`cursor-pointer inline-flex items-center justify-center rounded-2xl sm:rounded-xl text-sm font-semibold transition-all shadow-lg focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-blue-600 hover:bg-blue-500 text-white h-12 sm:h-10 px-6 sm:px-4 py-2 w-full sm:w-auto ${uploading ? 'opacity-50 scale-95' : 'active:scale-95'}`}>
                    {uploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />}
                    Upload File
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Main File Explorer */}
            <div className="lg:col-span-8 xl:col-span-9 order-2 lg:order-1">
              <div className="bg-[#0f111a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 uppercase tracking-wider">
                    <Folder className="w-4 h-4 text-blue-400" /> All Files
                  </h3>
                </div>
                
                <div className="p-2 sm:p-4">
                  {loading ? (
                    <div className="flex justify-center items-center py-32"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-500 space-y-4">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
                        <Folder className="w-10 h-10 text-gray-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-400">Your workspace is empty</p>
                      <p className="text-sm text-gray-500">Upload documents to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {files.map(file => {
                        const hasAccess = user?.role === 'ADMIN' || !file.is_confidential || requests.some(r => r.file_id === file.id && r.user_id === user?.id && r.status === 'APPROVED');
                        const isPending = requests.some(r => r.file_id === file.id && r.user_id === user?.id && r.status === 'PENDING');
                        
                        return (
                          <div key={file.id} className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between h-36">
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center shrink-0">
                                <File className="w-6 h-6 text-blue-400" />
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {hasAccess ? (
                                  <>
                                    <button 
                                      onClick={() => window.open(`/api/drive/download?fileId=${file.id}`, '_blank')}
                                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    {(user?.role === 'ADMIN' || file.owner_id === user?.id) && (
                                      <button 
                                        onClick={() => handleDelete(file.id)}
                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  isPending ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending</span>
                                  ) : (
                                    <button onClick={() => handleRequestAccess(file)} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-colors">
                                      Request
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-gray-200 line-clamp-1 mb-1 flex items-center gap-1.5">
                                {file.name}
                                {file.is_confidential && <ShieldAlert className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                              </h4>
                              <p className="text-xs text-gray-500 font-medium">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.folder}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side Panel (Storage & Requests) */}
            <div className="lg:col-span-4 xl:col-span-3 order-1 lg:order-2 space-y-6">
              
              <div className="bg-[#0f111a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-6">Storage Overview</h3>
                
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                    <circle 
                      cx="64" cy="64" r="60" 
                      stroke={storagePercentage > 90 ? '#ef4444' : storagePercentage > 80 ? '#f97316' : '#3b82f6'} 
                      strokeWidth="8" fill="none" 
                      strokeDasharray={`${2 * Math.PI * 60}`} 
                      strokeDashoffset={`${2 * Math.PI * 60 * (1 - Math.min(100, storagePercentage) / 100)}`} 
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{storagePercentage.toFixed(0)}%</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Used</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm mb-4">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">Used Space</span>
                    <span className="text-white font-medium">{(usedStorage / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-gray-500 text-xs">Total Limit</span>
                    <span className="text-white font-medium">1.0 GB</span>
                  </div>
                </div>

                {storagePercentage >= 80 && (
                  <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                    <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-300/90 leading-relaxed">Storage is running low. Please delete unused files.</p>
                  </div>
                )}
              </div>

              {user?.role === 'ADMIN' && (
                <div className="bg-[#0f111a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Access Requests</h3>
                  <div className="space-y-3">
                    {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                      <div className="py-6 flex flex-col items-center justify-center bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                        <CheckCircle className="w-8 h-8 text-gray-600 mb-2" />
                        <p className="text-xs text-gray-500 font-medium">All caught up</p>
                      </div>
                    ) : (
                      requests.filter(r => r.status === 'PENDING').map(req => (
                        <div key={req.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors">
                          <p className="text-sm font-semibold text-white mb-1">{req.user_name}</p>
                          <p className="text-xs text-gray-400 mb-4 line-clamp-1">{req.file_name}</p>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 h-9 rounded-xl text-xs font-semibold" onClick={() => handleApproveRequest(req.id, 'APPROVED')}>Approve</Button>
                            <Button size="sm" variant="outline" className="w-10 bg-red-500/5 text-red-400 hover:bg-red-500/10 border border-red-500/10 h-9 rounded-xl flex items-center justify-center p-0" onClick={() => handleApproveRequest(req.id, 'REJECTED')}><XCircle className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
