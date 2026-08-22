'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button'; // Assuming standard shadcn ui is present
import { Loader2 } from 'lucide-react';
import * as faceapi from 'face-api.js';

interface FaceScannerProps {
  onCapture: (base64Image: string) => void;
  promptText?: string;
  isProcessing?: boolean;
}

export function FaceScanner({ onCapture, promptText = "Position your face in the frame", isProcessing = false }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      } catch (err) {
        console.error('Failed to load face models', err);
      }
    };
    loadModels();

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
      if (animationRef.current) {
        clearInterval(animationRef.current as any);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleVideoPlay = () => {
    if (animationRef.current) clearInterval(animationRef.current as any);
    
    animationRef.current = setInterval(async () => {
      if (videoRef.current && overlayRef.current && faceapi.nets.ssdMobilenetv1.isLoaded) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current, 
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })
          );
          
          if (!videoRef.current || !overlayRef.current) return;
          
          const displaySize = { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
          };
          faceapi.matchDimensions(overlayRef.current, displaySize);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          const ctx = overlayRef.current.getContext('2d');
          ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
          
          faceapi.draw.drawDetections(overlayRef.current, resizedDetections);
        } catch (err) {
          // Ignore intermittent tensor errors
        }
      }
    }, 100) as any;
  };

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
            onPlay={handleVideoPlay}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Scanning Box overlay removed to let face-api draw it */}
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
