'use client';

import { useState, useEffect } from 'react';
import { FaceCapturePanel, type FaceCaptureResult } from '@/components/face/FaceCapturePanel';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { Users, ScanFace } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';


export default function AdminEnrollFacePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [step, setStep] = useState<'select' | 'capture'>('select');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(response => {
        setEmployees(response.data || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load employees');
        setLoading(false);
      });
  }, []);

  const handleCaptureComplete = async (result: FaceCaptureResult) => {
    try {
      const res = await fetch('/api/auth/enroll-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          embeddings: result.embeddings
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll face');

      toast.success('Face enrolled successfully!');
      setStep('select');
      setSelectedEmployeeId('');
    } catch (err: any) {
      toast.error(err.message);
      setStep('select');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <ScanFace className="w-8 h-8 text-cyan-400" />
          Face Enrollment
        </h1>
        <p className="text-gray-400 mt-2">
          Securely enroll an employee's face for biometric authentication. No external APIs are used; all processing is local.
        </p>
      </div>

      <Card className="p-6 border-white/5">
        {step === 'select' ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={loading}>
                <SelectTrigger className="w-full bg-[#0a0a16] border-white/10">
                  <SelectValue placeholder={loading ? "Loading..." : "Choose an employee..."} />
                </SelectTrigger>
                <SelectContent className="bg-[#111122] border-white/10">
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email}) {emp.face_verified ? '✅ (Enrolled)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setStep('capture')} 
              disabled={!selectedEmployeeId}
              className="w-full bg-cyan-600 hover:bg-cyan-500"
            >
              Start Face Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-white">Capturing Face...</h2>
              <Button variant="ghost" onClick={() => setStep('select')}>Cancel</Button>
            </div>
            <FaceCapturePanel 
              mode="enroll" 
              onComplete={handleCaptureComplete}
              onError={(msg) => toast.error(msg)}
            />
          </div>
        )}
      </Card>
          </div>
        </main>
      </div>
    </div>
  );
}