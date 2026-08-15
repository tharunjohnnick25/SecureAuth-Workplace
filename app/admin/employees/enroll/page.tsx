'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, ScanFace, UserPlus } from 'lucide-react';
import { FaceCapturePanel, type FaceCaptureResult } from '@/components/face/FaceCapturePanel';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';


interface EmployeeOption {
  id: string;
  full_name: string;
  email: string;
  employee_id?: string;
}

export default function EmployeeEnrollPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [consent, setConsent] = useState(false);
  const [capture, setCapture] = useState<FaceCaptureResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/employees')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setEmployees(res.data);
      })
      .catch(() => toast.error('Failed to load employees'));
  }, []);

  const filtered = employees.filter(
    (e) =>
      !search ||
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async () => {
    if (!selectedId) {
      toast.error('Please select an employee');
      return;
    }
    if (!consent) {
      toast.error('Consent is required before enrolling biometric data');
      return;
    }
    if (!capture || capture.embeddings.length < 3) {
      toast.error('Capture all 3 face samples (front, left, right) first');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/enroll-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedId,
          photos: capture.photos,
          embeddings: capture.embeddings,
          consentGiven: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');
      toast.success(data.message || 'Face enrolled successfully');
      router.push('/admin/employees');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/30">
            <UserPlus className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Enroll Employee Face</h1>
            <p className="text-sm text-slate-400">Biometric enrollment requires 3 photos and explicit consent</p>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Step 1 — Select employee</CardTitle>
            <CardDescription className="text-slate-400">
              Only the encrypted embedding is stored. Raw photos are deleted after 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-search">Search employee</Label>
              <Input
                id="emp-search"
                placeholder="Name, email, or employee ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border-slate-700"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selectedId === e.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">{e.full_name || e.email}</div>
                  <div className="text-xs text-slate-400">{e.email} {e.employee_id ? `• ${e.employee_id}` : ''}</div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No employees found</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Step 2 — Capture face samples</CardTitle>
            <CardDescription className="text-slate-400">
              Capture front, left 15°, and right 15° views. Face detection rejects no-face and multi-face images.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FaceCapturePanel mode="enroll" onComplete={(r) => setCapture(r)} disabled={!selectedId || submitting} />
            {capture && capture.embeddings.length === 3 && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                3 samples captured — embeddings ready for enrollment
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <div className="text-sm text-slate-300">
                <span className="font-medium text-white">I confirm this employee has given explicit consent for biometric authentication.</span>
                <p className="text-xs text-slate-400 mt-1">
                  Consent is recorded with a timestamp and can be withdrawn anytime from{' '}
                  <span className="text-blue-400">Settings → Biometrics</span>.
                </p>
              </div>
            </label>

            <Button onClick={handleSubmit} disabled={!selectedId || !consent || !capture || submitting} className="w-full py-6 text-lg">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ScanFace className="w-5 h-5 mr-2" />}
              {submitting ? 'Encrypting and storing…' : 'Complete enrollment'}
            </Button>
          </CardContent>
        </Card>
      </div>
            </main>
      </div>
    </div>
  );
}