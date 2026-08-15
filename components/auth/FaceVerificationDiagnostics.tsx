'use client';

import { useState, useEffect } from 'react';
import { Terminal, X } from 'lucide-react';

export default function FaceVerificationDiagnostics({ data }: { data: any }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if the debug flag is enabled in session storage
    if (sessionStorage.getItem('faceDebugMode') === 'true') {
      setIsVisible(true);
    }
    
    // Secret keyboard shortcut to toggle debug mode: Ctrl+Shift+D
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        const newState = !isVisible;
        setIsVisible(newState);
        sessionStorage.setItem('faceDebugMode', newState.toString());
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible || !data) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black/90 border border-cyan-500/50 rounded-lg p-4 shadow-2xl backdrop-blur-md z-50 font-mono text-xs text-green-400">
      <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="font-semibold text-white">Diagnostics (Admin)</span>
        </div>
        <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Timestamp:</span>
          <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={data.status === 'success' ? 'text-green-400' : 'text-red-400'}>
            {data.status?.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Raw Confidence:</span>
          <span className="text-cyan-400">{Number(data.confidence || 0).toFixed(4)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Liveness:</span>
          <span>{data.details?.liveness?.toUpperCase() || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Faces Detected:</span>
          <span>{data.details?.faces || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Message:</span>
          <span className="text-right ml-4">{data.message || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
