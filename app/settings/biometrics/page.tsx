'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ScanFace, ShieldCheck, Trash2, Clock, Loader2, BadgeCheck, Ban } from 'lucide-react';
import { FaceCapturePanel, type FaceCaptureResult } from '@/components/face/FaceCapturePanel';

interface BiometricStatus {
  faceEnrolled: boolean;
  consentGiven: boolean;
  consentTimestamp: string | null;
  enrolledAt: string | null;
  lastFaceLoginAt: string | null;
  deleteRequestedAt: string | null;
  deletionScheduledFor: string | null;
}

interface AttemptRow {
  id: string;
  timestamp: string;
  similarityScore: number | null;
  livenessPass: boolean;
  success: boolean;
  failureReason: string | null;
}

export default function BiometricsSettingsPage() {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reEnrolling, setReEnrolling] = useState(false);
  const [consent, setConsent] = useState(false);
  const [capture, setCapture] = useState<FaceCaptureResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [enrollMode, setEnrollMode] = useState<'camera' | 'upload'>('camera');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/biometrics/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setAttempts(data.attempts ?? []);
      }
    } catch {
      toast.error('Failed to load biometric status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setUploadPreview(base64);
      setCapture({
        photos: [base64.split(',')[1] || base64], // Send pure base64
        embeddings: [], // Will be extracted by backend
        liveness: { passivePassed: true, activePassed: true, score: 1 },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleReEnroll = async () => {
    if (!consent) {
      toast.error('Please confirm you consent to biometric processing');
      return;
    }
    if (!capture || (enrollMode === 'camera' && capture.embeddings.length < 3)) {
      toast.error('Capture all 3 face samples or upload an image first');
      return;
    }
    setReEnrolling(true);
    try {
      const res = await fetch('/api/biometrics/re-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: capture.photos,
          embeddings: capture.embeddings,
          consentGiven: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-enrollment failed');
      toast.success(data.message || 'Face re-enrolled');
      setReEnrolling(false);
      setCapture(null);
      setConsent(false);
      await load();
    } catch (err: any) {
      toast.error(err.message);
      setReEnrolling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/biometrics/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');
      toast.success(data.message || 'Biometric data deletion scheduled');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">Biometrics</h1>
            <p className="text-gray-400">Face recognition enrollment, consent, and data rights</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Status card */}
              <Card className="lg:col-span-1 p-6 bg-black/40 backdrop-blur-xl border-white/10 h-fit">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full ${status?.faceEnrolled ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-500/10 border border-slate-500/30'}`}>
                    {status?.faceEnrolled ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <Ban className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold">Enrollment status</h3>
                    <p className={`text-xs ${status?.faceEnrolled ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {status?.faceEnrolled ? 'Enrolled' : 'Not enrolled'}
                    </p>
                  </div>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-400">Consent given</dt><dd className="font-medium">{status?.consentGiven ? 'Yes' : 'No'}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Consent at</dt><dd className="font-medium text-xs text-right">{fmtDate(status?.consentTimestamp)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Enrolled at</dt><dd className="font-medium text-xs text-right">{fmtDate(status?.enrolledAt)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Last face login</dt><dd className="font-medium text-xs text-right">{fmtDate(status?.lastFaceLoginAt)}</dd></div>
                  {status?.deleteRequestedAt && (
                    <div className="flex justify-between"><dt className="text-gray-400">Hard delete at</dt><dd className="font-medium text-xs text-right text-amber-400">{fmtDate(status.deletionScheduledFor)}</dd></div>
                  )}
                </dl>

                <div className="mt-6 space-y-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete face data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete biometric data?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Your face data will be soft-deleted immediately. Hard deletion completes after 30 days
                          per GDPR/DPDP right-to-erasure. Audit logs (what happened, not biometric data) are retained.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                          {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Confirm deletion
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>

              {/* Re-enroll card */}
              <Card className="lg:col-span-2 p-6 bg-black/40 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <ScanFace className="w-5 h-5 text-blue-400" />
                      Re-enroll face
                    </div>
                    <div className="flex bg-white/5 rounded-lg p-1 w-fit">
                      <button
                        onClick={() => setEnrollMode('camera')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${enrollMode === 'camera' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        Camera
                      </button>
                      <button
                        onClick={() => setEnrollMode('upload')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${enrollMode === 'upload' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        Upload
                      </button>
                    </div>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {enrollMode === 'camera' ? 'Capture front, left 15°, and right 15° views.' : 'Upload a clear, front-facing photo of your face.'} Re-enrollment replaces your existing encrypted embedding.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {enrollMode === 'camera' ? (
                    <FaceCapturePanel mode="enroll" onComplete={(r) => setCapture(r)} disabled={reEnrolling} />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl bg-black/20">
                      {uploadPreview ? (
                        <div className="relative mb-4">
                          <img src={uploadPreview} alt="Preview" className="w-48 h-48 object-cover rounded-xl border border-white/10" />
                          <button onClick={() => { setUploadPreview(null); setCapture(null); }} className="absolute -top-2 -right-2 bg-red-500 p-1.5 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center cursor-pointer text-slate-400 hover:text-white transition-colors">
                          <ScanFace className="w-12 h-12 mb-3 text-blue-400" />
                          <span className="text-sm font-medium">Click to upload a clear face photo</span>
                          <span className="text-xs mt-1 text-slate-500">JPG or PNG (max 5MB)</span>
                          <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileUpload} />
                        </label>
                      )}
                    </div>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                    <span className="text-sm text-slate-300">
                      I consent to biometric processing of my face data (recorded with timestamp).
                    </span>
                  </label>

                  <Button onClick={handleReEnroll} disabled={!consent || !capture || reEnrolling} className="w-full">
                    {reEnrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BadgeCheck className="w-4 h-4 mr-2" />}
                    Re-enroll face
                  </Button>
                </CardContent>
              </Card>

              {/* Recent attempts */}
              <Card className="lg:col-span-3 p-6 bg-black/40 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-purple-400" />
                    Recent face login attempts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attempts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No face login attempts yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-white/10">
                            <th className="py-2 pr-4">Time</th>
                            <th className="py-2 pr-4">Similarity</th>
                            <th className="py-2 pr-4">Liveness</th>
                            <th className="py-2 pr-4">Result</th>
                            <th className="py-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attempts.map((a) => (
                            <tr key={a.id} className="border-b border-white/5">
                              <td className="py-2 pr-4 text-gray-300">{new Date(a.timestamp).toLocaleString()}</td>
                              <td className="py-2 pr-4">{a.similarityScore != null ? a.similarityScore.toFixed(4) : '—'}</td>
                              <td className="py-2 pr-4">{a.livenessPass ? 'Passed' : 'Failed'}</td>
                              <td className="py-2 pr-4">
                                <span className={`px-2 py-0.5 rounded text-xs ${a.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {a.success ? 'Success' : 'Failed'}
                                </span>
                              </td>
                              <td className="py-2 text-gray-400">{a.failureReason ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function fmtDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}
