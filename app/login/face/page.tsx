'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaceScanner } from '@/components/FaceScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function FaceLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("Position your face to verify");

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setStep(2);
  };

  const handleFaceCapture = async (base64Image: string) => {
    setIsProcessing(true);
    setPrompt("Verifying face match and liveness...");
    
    try {
      const response = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, image: base64Image }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Face verified successfully!');
        // Ideally we set some auth context here, then redirect
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        toast.error(data.error || 'Verification failed');
        setPrompt("Verification failed. Please try again.");
      }
    } catch (error) {
      toast.error('An error occurred during verification');
      setPrompt("Error connecting to verification service.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
              <ShieldCheck className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Biometric Login</CardTitle>
          <CardDescription className="text-slate-400">
            Enterprise-grade face detection and verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 max-w-sm mx-auto">
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john.doe@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-slate-700 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-slate-700 focus:border-blue-500"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-6">
                Continue to Face Scan
              </Button>
            </form>
          ) : (
            <div className="animate-in fade-in zoom-in duration-300">
              <FaceScanner 
                onCapture={handleFaceCapture}
                promptText={prompt}
                isProcessing={isProcessing}
              />
              <div className="mt-4 text-center">
                <Button variant="link" onClick={() => setStep(1)} className="text-slate-400 hover:text-white">
                  Back to credentials
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
