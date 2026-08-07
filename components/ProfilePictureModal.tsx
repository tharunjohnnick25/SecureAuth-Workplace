'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64Image: string) => void;
  currentImage?: string;
}

export function ProfilePictureModal({ isOpen, onClose, onSave, currentImage }: ProfilePictureModalProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [image, setImage] = useState<string | null>(currentImage || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('select');
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
    } catch (err) {
      toast.error('Could not access camera. Please allow permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Crop to square
        const video = videoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        canvasRef.current.width = 400;
        canvasRef.current.height = 400;
        context.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);
        
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setImage(dataUrl);
        stopCamera();
        setMode('preview');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (image) {
      onSave(image);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0b132b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="font-bold text-lg text-white">Update Profile Picture</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[350px]">
          {mode === 'select' && (
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={startCamera}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-3 transition-colors group"
              >
                <div className="p-3 bg-blue-500/20 rounded-full group-hover:bg-blue-500/30 transition-colors">
                  <Camera className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-white">Take a Photo</p>
                  <p className="text-xs text-gray-400">Use your webcam</p>
                </div>
              </button>

              <label className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-3 transition-colors group cursor-pointer">
                <div className="p-3 bg-green-500/20 rounded-full group-hover:bg-green-500/30 transition-colors">
                  <Upload className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-white">Upload Image</p>
                  <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              
              {currentImage && (
                <button 
                  onClick={() => { setImage(currentImage); setMode('preview'); }}
                  className="mt-4 text-sm text-gray-400 hover:text-white"
                >
                  Keep Current Image
                </button>
              )}
            </div>
          )}

          {mode === 'camera' && (
            <div className="flex flex-col items-center w-full">
              <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-500/30 shadow-lg bg-black mb-6">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover" 
                />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex gap-4">
                <button onClick={() => { stopCamera(); setMode('select'); }} className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:bg-white/5">
                  Cancel
                </button>
                <button onClick={capturePhoto} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Capture
                </button>
              </div>
            </div>
          )}

          {mode === 'preview' && image && (
            <div className="flex flex-col items-center w-full">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/20 shadow-xl mb-8">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              </div>
              
              <div className="flex gap-4 w-full">
                <button onClick={() => setMode('select')} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-gray-300">
                  Try Again
                </button>
                <button onClick={handleSave} className="flex-1 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
