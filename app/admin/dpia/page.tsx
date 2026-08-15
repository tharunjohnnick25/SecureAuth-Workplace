'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShieldAlert, Loader2, Save, FileCheck2, ShieldCheck } from 'lucide-react';
import {
  DPIA_QUESTIONS,
  computeDpiaRisk,
  type DpiaAnswerValue,
  type DpiaRisk,
  type DpiaSubmission,
} from '@/lib/face/dpia';

interface DpiaRecord {
  id: string;
  employee_scope?: string;
  risk_level?: string;
  status?: string;
  created_at?: string;
}

const ANSWER_OPTIONS: { value: DpiaAnswerValue; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'partial', label: 'Partial' },
  { value: 'no', label: 'No' },
];

export default function DpiaPage() {
  const [answers, setAnswers] = useState<Record<string, { answer?: DpiaAnswerValue; notes?: string }>>({});
  const [scope, setScope] = useState('ALL_EMPLOYEES');
  const [records, setRecords] = useState<DpiaRecord[]>([]);
  const [risk, setRisk] = useState<DpiaRisk | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dpia');
      const data = await res.json();
      if (data.success) setRecords(data.data ?? []);
    } catch {
      toast.error('Failed to load DPIA records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateAnswer = (id: string, answer: DpiaAnswerValue) => {
    const next = { ...answers, [id]: { ...answers[id], answer } };
    setAnswers(next);
    setRisk(computeDpiaRisk({ answers: next as DpiaSubmission['answers'] }));
  };

  const updateNotes = (id: string, notes: string) => {
    const next = { ...answers, [id]: { ...answers[id], notes } };
    setAnswers(next);
  };

  const save = async () => {
    const submission: DpiaSubmission = {
      answers: answers as DpiaSubmission['answers'],
      employeeScope: scope,
    };
    const computed = computeDpiaRisk(submission);
    if (computed.noCount > 0 && !window.confirm('Some answers are "No". The DPIA risk will be HIGH or MEDIUM. Save anyway?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/dpia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success(`DPIA saved — risk level: ${data.data.risk_level}`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const riskColor =
    risk?.riskLevel === 'HIGH' ? 'text-red-400' : risk?.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 pt-24 overflow-x-hidden">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">Data Protection Impact Assessment</h1>
            <p className="text-gray-400">GDPR Art. 35 & DPDP Act — face recognition processing</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checklist */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-purple-400" />
                    <h2 className="font-bold">DPIA checklist</h2>
                  </div>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="ALL_EMPLOYEES">All employees</option>
                    <option value="EMPLOYEES_ONLY">Employees only</option>
                    <option value="CONTRACTORS">Contractors</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {DPIA_QUESTIONS.map((q) => (
                    <div key={q.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-wider text-purple-400">{q.category}</span>
                            {q.critical && <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Critical</Badge>}
                          </div>
                          <p className="font-medium">{q.text}</p>
                          <p className="text-xs text-gray-400 mt-1">{q.hint}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {ANSWER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateAnswer(q.id, opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                              answers[q.id]?.answer === opt.value
                                ? opt.value === 'yes'
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                                  : opt.value === 'partial'
                                    ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                                    : 'border-red-500 bg-red-500/15 text-red-300'
                                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <Textarea
                        placeholder="Evidence / notes…"
                        value={answers[q.id]?.notes ?? ''}
                        onChange={(e) => updateNotes(q.id, e.target.value)}
                        className="mt-3 bg-slate-900 border-white/10 text-sm min-h-16"
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={save} disabled={saving} className="mt-6 w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save assessment
                </Button>
              </Card>
            </div>

            {/* Risk summary + history */}
            <div className="space-y-4">
              <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  Risk summary
                </h2>
                {risk ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-bold ${riskColor}`}>{risk.riskLevel}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Score</span><span>{risk.score}/100</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">"No" answers</span><span className={risk.noCount > 0 ? 'text-red-400' : ''}>{risk.noCount}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">"Partial" answers</span><span className="text-amber-400">{risk.partialCount}</span></div>
                    </div>
                    {risk.criticalNo.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                        Critical controls missing: {risk.criticalNo.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Answer the checklist to compute the risk level.</p>
                )}
              </Card>

              <Card className="p-6 bg-black/40 backdrop-blur-xl border-white/10">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Saved assessments
                </h2>
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : records.length === 0 ? (
                  <p className="text-sm text-gray-400">No assessments saved yet.</p>
                ) : (
                  <div className="space-y-2">
                    {records.map((r) => (
                      <div key={r.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                        <div className="flex justify-between items-center">
                          <span>{r.employee_scope ?? 'ALL_EMPLOYEES'}</span>
                          <Badge
                            className={
                              r.risk_level === 'HIGH'
                                ? 'bg-red-500/20 text-red-300'
                                : r.risk_level === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                            }
                          >
                            {r.risk_level}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {r.status} • {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
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
