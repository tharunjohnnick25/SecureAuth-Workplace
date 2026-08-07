'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, HardDrive, File, Folder, Download, Trash2, Upload, AlertCircle, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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
        fetch(`/api/drive/files?user_id=${user?.id}&role=${user?.role}`),
        fetch(`/api/drive/requests`)
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user?.id || '');
      formData.append('is_confidential', 'false'); // Default, can be upgraded by admin

      const res = await fetch('/api/drive/files', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('File uploaded to Google Drive workspace');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
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
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                <HardDrive className="w-8 h-8 text-blue-400" /> Company Workspace
              </h1>
              <p className="text-gray-400 text-sm">Secure Google Drive integration (OAuth 2.0)</p>
            </div>
            {user?.role === 'ADMIN' && (
              <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-500">
                Connect Google Drive
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Storage Monitor */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Storage Monitor (1 GB limit)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Used: {(usedStorage / (1024 * 1024)).toFixed(1)} MB</span>
                    <span>Total: 1024 MB</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div 
                      className={`h-full ${storagePercentage > 90 ? 'bg-red-500' : storagePercentage > 80 ? 'bg-orange-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, storagePercentage)}%` }}
                    />
                  </div>
                  {storagePercentage >= 80 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>Warning: Workspace storage is at {storagePercentage.toFixed(1)}% capacity.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {user?.role === 'ADMIN' && (
                <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Access Requests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">No pending requests</p>
                    ) : (
                      requests.filter(r => r.status === 'PENDING').map(req => (
                        <div key={req.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <p className="text-sm font-medium text-white">{req.user_name}</p>
                          <p className="text-xs text-gray-400 mb-2">Requested: {req.file_name}</p>
                          <div className="flex gap-2">
                            <Button size="sm" className="w-full bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs h-7" onClick={() => handleApproveRequest(req.id, 'APPROVED')}>Approve</Button>
                            <Button size="sm" variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs h-7" onClick={() => handleApproveRequest(req.id, 'REJECTED')}>Reject</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* File Explorer */}
            <div className="lg:col-span-3">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4">
                  <CardTitle className="text-white text-sm flex items-center gap-2"><Folder className="w-4 h-4 text-gray-400"/> /My Drive/Company Workspace</CardTitle>
                  <div>
                    <input type="file" id="drive-upload" className="hidden" onChange={handleUpload} disabled={uploading} />
                    <label htmlFor="drive-upload">
                      <div className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 border-white/10 ${uploading ? 'opacity-50' : ''}`}>
                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload File
                      </div>
                    </label>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                      <Folder className="w-12 h-12 mb-3 opacity-20" />
                      <p>Workspace is empty</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {files.map(file => {
                        const hasAccess = user?.role === 'ADMIN' || !file.is_confidential || requests.some(r => r.file_id === file.id && r.user_id === user?.id && r.status === 'APPROVED');
                        const isPending = requests.some(r => r.file_id === file.id && r.user_id === user?.id && r.status === 'PENDING');
                        
                        return (
                          <div key={file.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <File className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                  {file.name}
                                  {file.is_confidential && <ShieldAlert className="w-3.5 h-3.5 text-orange-400" title="Confidential" />}
                                </h4>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.folder}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {hasAccess ? (
                                <>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white" onClick={() => toast.info('Download starting...')}><Download className="w-4 h-4" /></Button>
                                  {(user?.role === 'ADMIN' || file.owner_id === user?.id) && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(file.id)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                                  )}
                                </>
                              ) : (
                                isPending ? (
                                  <span className="text-xs px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Access Pending</span>
                                ) : (
                                  <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-8 text-xs" onClick={() => handleRequestAccess(file)}>
                                    Request Access
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
