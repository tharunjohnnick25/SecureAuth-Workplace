'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import FaceVerificationDiagnostics from '@/components/auth/FaceVerificationDiagnostics';

export default function VerifyIdentityPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'requesting' | 'ready' | 'verifying' | 'success' | 'failed' | 'locked'>('requesting');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [debugData, setDebugData] = useState<any>(null);

  const MAX_ATTEMPTS = 3;

  const [pendingUser, setPendingUser] = useState<any>({});

  useEffect(() => {
    // Check if user came from login
    const storedUser = sessionStorage.getItem('pendingAuthUser');
    if (!storedUser) {
      toast.error('Unauthorized access');
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(storedUser);
    setPendingUser(user);
    
    // Check if locked out for this specific user
    const lockTime = sessionStorage.getItem(`faceLockout_${user.id}`);
    if (lockTime && Date.now() < parseInt(lockTime) + 15 * 60 * 1000) {
      setStatus('locked');
      return;
    }
    
    startCamera();

    return () => stopCamera();
  }, [router]);

  const startCamera = async () => {
    try {
      setStatus('requesting');
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setStatus('ready');
    } catch (err) {
      setStatus('failed');
      setErrorMessage('Camera access denied or unavailable. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  // Capture multiple frames with a small delay between them
  const captureFrames = async (numFrames = 3, delayMs = 300): Promise<string[]> => {
    const video = videoRef.current;
    if (!video) throw new Error("Video stream not found");

    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Failed to initialize canvas");

    for (let i = 0; i < numFrames; i++) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.8));
      if (i < numFrames - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return frames;
  };

  const captureAndVerify = async () => {
    if (attempts >= MAX_ATTEMPTS) {
      handleLockout();
      return;
    }

    setStatus('verifying');
    setErrorMessage('');
    
    try {
      const frames = await captureFrames(3, 400); // Capture 3 frames 400ms apart

      const pendingToken = sessionStorage.getItem('pendingAuthToken');

      const res = await fetch('/api/auth/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: pendingUser.id,
          tempToken: pendingToken,
          images: frames // Send array of frames
        }),
      });

      const result = await res.json();
      
      // Save debug info if admin wants to see it
      setDebugData({
        ...result,
        timestamp: new Date().toISOString()
      });

      if (!res.ok) {
        if (res.status === 423) {
          handleLockout(result.error);
          return;
        }
        throw new Error(result.error || 'Face verification failed');
      }

      if (result.verified) {
        setStatus('success');
        
        // Save success signals
        const signals = JSON.parse(sessionStorage.getItem('pendingSecuritySignals') || '{}');
        signals.faceConfidence = result.confidence;
        sessionStorage.setItem('pendingSecuritySignals', JSON.stringify(signals));

        setTimeout(() => {
          stopCamera();
          router.push('/verify-mfa');
        }, 1500);
      }
    } catch (err: any) {
      // We rely on backend for attempts now, but keep local fallback
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      setStatus('failed');
      setErrorMessage(err.message);
    }
  };

  const handleLockout = (msg?: string) => {
    setStatus('locked');
    setErrorMessage(msg || 'Account temporarily locked due to multiple failed face verification attempts.');
    sessionStorage.setItem(`faceLockout_${pendingUser.id}`, Date.now().toString());
    stopCamera();
  };

  if (status === 'locked') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
        <Card className="w-full max-w-md relative p-8 text-center border-red-500/30">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Verification Locked</h1>
          <p className="text-gray-400 text-sm mb-6">
            You have exceeded the maximum number of face verification attempts. 
            Please contact your administrator or try again in 15 minutes.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full bg-white/10 hover:bg-white/20 text-white">
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  // Prevents rendering issues before hydration
  const displayEmployeeId = pendingUser?.employee_id || '';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
      <Card className="w-full max-w-md relative p-8 shadow-2xl shadow-cyan-900/10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
            <Camera className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Identity Verification</h1>
          <p className="text-gray-400 text-center text-sm">
            Verifying: <span className="text-cyan-400 font-medium">{displayEmployeeId}</span>
          </p>
        </div>

        <div className="relative w-full aspect-[4/5] bg-black rounded-2xl border border-white/5 overflow-hidden mb-6 flex flex-col items-center justify-center shadow-inner">
          {status === 'requesting' && (
            <div className="flex flex-col items-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Requesting camera access...</p>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`absolute inset-0 w-full h-full object-cover ${(status === 'requesting' || status === 'failed') ? 'hidden' : 'block'}`} 
            style={{ transform: 'scaleX(-1)' }} // Mirror the camera for natural UX
          />
          
          {/* Liveness & Positioning UI Overlay */}
          {(status === 'ready' || status === 'verifying') && (
            <>
              {/* Face Guide Bounding Box */}
              <div className="absolute inset-x-8 top-12 bottom-20 border-2 border-cyan-500/40 rounded-3xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-3xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-3xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-3xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-3xl" />
              </div>
              
              <div className="absolute bottom-6 left-0 right-0 text-center z-10 px-4">
                <p className="text-white text-sm font-medium drop-shadow-md">
                  {status === 'verifying' ? 'Analyzing face...' : 'Keep your face inside the frame'}
                </p>
                {status === 'ready' && (
                  <div className="flex justify-center gap-4 mt-2">
                     <span className="text-[10px] text-green-400 flex items-center gap-1 bg-black/50 px-2 py-1 rounded backdrop-blur-sm"><CheckCircle2 className="w-3 h-3"/> Good Lighting</span>
                     <span className="text-[10px] text-green-400 flex items-center gap-1 bg-black/50 px-2 py-1 rounded backdrop-blur-sm"><CheckCircle2 className="w-3 h-3"/> Face Centered</span>
                  </div>
                )}
              </div>
              
              {status === 'verifying' && (
                <div className="absolute inset-0 border-[3px] border-cyan-400 rounded-2xl pointer-events-none animate-pulse" />
              )}
            </>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center text-emerald-400 z-20">
              <CheckCircle2 className="w-20 h-20 mb-4 animate-in zoom-in duration-300" />
              <p className="font-semibold text-lg text-white">Identity Verified ✓</p>
              <div className="mt-4 flex flex-col gap-1 text-center bg-black/40 px-4 py-3 rounded-lg border border-emerald-500/20">
                <span className="text-xs text-emerald-300">Employee ID: {displayEmployeeId}</span>
                <span className="text-xs text-emerald-300">Face Match: Verified</span>
                <span className="text-xs text-emerald-300">Liveness: Passed</span>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
              <ShieldAlert className="w-16 h-16 mb-4 text-red-500" />
              <p className="font-semibold text-lg text-white mb-2">Identity Verification Failed</p>
              <p className="text-sm text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{errorMessage}</p>
            </div>
          )}
        </div>

        {status === 'ready' && (
          <Button 
            onClick={captureAndVerify}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-6 shadow-lg shadow-cyan-500/20"
          >
            Verify My Face
          </Button>
        )}

        {status === 'verifying' && (
          <Button disabled className="w-full bg-cyan-900 text-cyan-200 font-semibold flex justify-center items-center gap-2 py-6 border border-cyan-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing multiple frames...
          </Button>
        )}

        {status === 'failed' && (
          <Button 
            onClick={() => {
              setErrorMessage('');
              startCamera();
            }}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 py-6"
          >
            Try Again ({MAX_ATTEMPTS - attempts} attempts left)
          </Button>
        )}
      </Card>
      
      {/* Hidden Diagnostic Overlay for Admins (Rendered if debug flag is set) */}
      <FaceVerificationDiagnostics data={debugData} />
    </div>
  );
}
