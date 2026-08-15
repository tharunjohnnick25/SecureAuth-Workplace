'use client';

import React, { useState } from 'react';
import { FaceScanner } from '@/components/FaceScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';


export default function AdminRegisterEmployeePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("Look Straight");

  // Mock directions for the registration flow
  const directions = ["Look Straight", "Look Left", "Look Right", "Look Up", "Look Down"];

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please enter Employee ID");
      return;
    }
    setStep(2);
  };

  const handleFaceCapture = (base64Image: string) => {
    const newImages = [...capturedImages, base64Image];
    setCapturedImages(newImages);

    if (newImages.length < directions.length) {
      setPrompt(directions[newImages.length]);
      toast.success(`Captured ${directions[newImages.length - 1]} face`);
    } else {
      setPrompt("Processing final registration...");
      submitRegistration(newImages);
    }
  };

  const submitRegistration = async (images: string[]) => {
    setIsProcessing(true);
    try {
      const PYTHON_SERVICE_URL = process.env.NEXT_PUBLIC_PYTHON_FACE_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${PYTHON_SERVICE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: employeeId, images: images }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Employee face registered successfully!');
        // Reset form
        setTimeout(() => {
          setStep(1);
          setEmployeeId('');
          setCapturedImages([]);
          setPrompt(directions[0]);
        }, 2000);
      } else {
        toast.error(data.detail || 'Registration failed');
        setCapturedImages([]);
        setPrompt(directions[0]);
      }
    } catch (error) {
      toast.error('An error occurred during registration');
      setCapturedImages([]);
      setPrompt(directions[0]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="p-8 max-w-4xl mx-auto">
      <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Register Employee Face</CardTitle>
          <CardDescription className="text-slate-400">
            Link facial biometrics to an employee profile for enterprise login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleDetailsSubmit} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="empId">Employee UUID (User ID)</Label>
                <Input 
                  id="empId" 
                  type="text" 
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" 
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="bg-slate-950 border-slate-700"
                />
                <p className="text-xs text-slate-500">In a real app, this would be selected from a list of users.</p>
              </div>
              
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 mt-4">
                Proceed to Camera
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div>
                  <p className="text-sm text-slate-400">Registering for User ID:</p>
                  <p className="font-medium text-blue-400 font-mono text-sm">{employeeId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Progress</p>
                  <p className="font-bold text-xl">{capturedImages.length} / {directions.length}</p>
                </div>
              </div>

              <div className="flex justify-center animate-in slide-in-from-bottom-4 duration-500">
                <FaceScanner 
                  onCapture={handleFaceCapture}
                  promptText={`Action required: ${prompt}`}
                  isProcessing={isProcessing}
                />
              </div>
              
              <div className="text-center">
                <Button variant="outline" onClick={() => { setStep(1); setCapturedImages([]); setPrompt(directions[0]); }} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  Cancel Registration
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
          </div>
        </main>
      </div>
    </div>
  );
}