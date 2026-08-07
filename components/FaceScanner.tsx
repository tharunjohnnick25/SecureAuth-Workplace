'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button'; // Assuming standard shadcn ui is present
import { Loader2 } from 'lucide-react';

interface FaceScannerProps {
  onCapture: (base64Image: string) => void;
  promptText?: string;
  isProcessing?: boolean;
}

export function FaceScanner({ onCapture, promptText = "Position your face in the frame", isProcessing = false }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError('Camera access denied or unavailable.');
        console.error(err);
      }
    }
    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const base64Image = canvasRef.current.toDataURL('image/jpeg');
        onCapture(base64Image);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-xl bg-slate-900 shadow-xl relative overflow-hidden">
      <div className="text-center font-medium text-slate-200 min-h-8">
        {promptText}
      </div>

      {error ? (
        <div className="text-red-500 bg-red-500/10 p-4 rounded-md w-full text-center">{error}</div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border-2 border-slate-700 w-[320px] h-[240px] md:w-[640px] md:h-[480px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          {/* Scanning Box overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 md:w-64 md:h-64 border-4 border-blue-500/50 rounded-full"></div>
          </div>
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} width={640} height={480} className="hidden" />

      <Button 
        onClick={handleCapture} 
        disabled={isProcessing || !!error}
        className="w-full max-w-sm mt-4 text-lg py-6 bg-blue-600 hover:bg-blue-700 transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)]"
      >
        {isProcessing ? 'Processing...' : 'Capture'}
      </Button>
    </div>
  );
}
