'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmployeeService } from '@/lib/services/employees';
import { Employee, EmployeeDocument, DocumentType } from '@/types/employees';
import { Loader2, ArrowLeft, Mail, Phone, Calendar, MapPin, User, Briefcase, Building2, Users, FileText, Upload, Download, Trash2, Camera, Plus, X, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

const DOCUMENT_TYPES: DocumentType[] = ['Aadhaar', 'PAN', 'Passport', 'Resume', 'Offer Letter', 'Experience Certificate', 'Degree Certificate', 'Driving License', 'Other'];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-400 border-green-500/20',
  Inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Resigned: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'On Leave': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Retired: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('Other');
  const [showUpload, setShowUpload] = useState(false);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const emp = await EmployeeService.getEmployee(id);
      setEmployee(emp);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const docs = await EmployeeService.getDocuments(id);
      setDocuments(docs);
    } catch { /* ignore */ } finally {
      setDocsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadEmployee(); loadDocuments(); }, [loadEmployee, loadDocuments]);

  const handlePhotoUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: URL.createObjectURL(file) }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        toast.success('Photo updated');
        loadEmployee();
      } catch (e: any) {
        toast.error(e.message || 'Failed to upload photo');
      }
    };
    input.click();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await EmployeeService.uploadDocument(id, file, uploadDocType);
      toast.success('Document uploaded');
      setShowUpload(false);
      loadDocuments();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await EmployeeService.deleteDocument(id, docId);
      toast.success('Document deleted');
      loadDocuments();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Employee Not Found</p>
          <p className="text-gray-400 text-sm mb-4">The requested employee could not be found.</p>
          <Button onClick={() => router.push('/employees')}>Back to Directory</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Directory
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardContent className="p-6 text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                      {employee.avatar_url ? (
                        <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        employee.full_name?.charAt(0) || 'U'
                      )}
                    </div>
                    <button onClick={handlePhotoUpload}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors shadow-lg">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-white">{employee.full_name || 'Unknown'}</h2>
                  <p className="text-sm text-gray-400">{employee.designation || 'No designation'}</p>
                  {employee.employee_id && (
                    <p className="text-xs text-gray-500 mt-1">ID: {employee.employee_id}</p>
                  )}
                  <div className="mt-4">
                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${STATUS_STYLES[employee.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {employee.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4 justify-center">
                    <Link href={`/employees/${id}/edit`}>
                      <Button variant="outline" className="border-white/10 text-xs">Edit Profile</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader><CardTitle className="text-white text-sm">Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-gray-500" /><span className="text-gray-300">{employee.email}</span></div>
                  <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-gray-500" /><span className="text-gray-300">{employee.phone || '-'}</span></div>
                  <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-gray-500" /><span className="text-gray-300">{employee.address || '-'}</span></div>
                  <div className="flex items-center gap-3 text-sm"><Users className="w-4 h-4 text-gray-500" /><span className="text-gray-300">Emergency: {employee.emergency_contact || '-'}</span></div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader><CardTitle className="text-white text-sm">Personal Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Full Name</span><p className="text-white">{employee.full_name || '-'}</p></div>
                    <div><span className="text-gray-500">Gender</span><p className="text-white">{employee.gender || '-'}</p></div>
                    <div><span className="text-gray-500">Date of Birth</span><p className="text-white">{employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : '-'}</p></div>
                    <div><span className="text-gray-500">Blood Group</span><p className="text-white">{employee.blood_group || '-'}</p></div>
                    <div><span className="text-gray-500">Email</span><p className="text-white">{employee.email}</p></div>
                    <div><span className="text-gray-500">Phone</span><p className="text-white">{employee.phone || '-'}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader><CardTitle className="text-white text-sm">Employment Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Department</span><p className="text-white">{employee.department || '-'}</p></div>
                    <div><span className="text-gray-500">Designation</span><p className="text-white">{employee.designation || '-'}</p></div>
                    <div><span className="text-gray-500">Employment Type</span><p className="text-white">{employee.employment_type || '-'}</p></div>
                    <div><span className="text-gray-500">Date of Joining</span><p className="text-white">{employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : '-'}</p></div>
                    <div><span className="text-gray-500">Manager</span><p className="text-white">{employee.manager_name || '-'}</p></div>
                    <div><span className="text-gray-500">Salary</span><p className="text-white">{employee.salary ? `$${Number(employee.salary).toLocaleString()}` : '-'}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white text-sm">Documents</CardTitle>
                  <Button onClick={() => setShowUpload(true)} variant="outline" className="border-white/10 text-xs h-8">
                    <Upload className="w-3 h-3 mr-1" /> Upload
                  </Button>
                </CardHeader>
                <CardContent>
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-sm text-white font-medium">{doc.document_name}</p>
                              <p className="text-xs text-gray-500">{doc.document_type}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleDeleteDoc(doc.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b132b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Upload className="w-6 h-6" /></div>
                  <div><h3 className="text-lg font-bold text-white">Upload Document</h3><p className="text-xs text-gray-400">PDF, DOCX, PNG, JPEG (max 10MB)</p></div>
                </div>
                <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Document Type</label>
                <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white">
                  {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleDocUpload} disabled={uploading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs hover:file:bg-blue-500" />
              {uploading && <div className="flex items-center gap-2 mt-3 text-sm text-blue-400"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
