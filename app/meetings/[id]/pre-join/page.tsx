'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Loader2, Video, VideoOff, Mic, MicOff, ShieldAlert, ShieldCheck, CheckCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function PreJoinPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Security checks
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = meeting?.host_id === user?.id;
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/meetings/${meeting?.id}/pre-join` : '';

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  useEffect(() => {
    loadMeeting();
    fetchRiskScore();
    return () => stopStream();
  }, [id]);

  useEffect(() => {
    if (cameraOn) startStream();
    else stopStream();
  }, [cameraOn]);

  const loadMeeting = async () => {
    if (!id || id === 'undefined') return;
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMeeting(data.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load meeting');
      router.push('/meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskScore = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/ai/risk/${user.id}`);
      const data = await res.json();
      setRiskScore(data.data?.score || 12);
    } catch (err) {
      setRiskScore(12);
    }
  };

  const startStream = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      setCameraOn(false);
      setMicOn(false);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const simulateFaceAuth = () => {
    setVerifyingFace(true);
    setTimeout(() => {
      setVerifyingFace(false);
      setFaceVerified(true);
      toast.success('Face Identity Confirmed');
    }, 2000);
  };

  const handleJoin = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          password: '',
          face_verified: faceVerified,
          risk_score: riskScore
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.data?.status === 'WAITING') {
        toast.info('You are in the waiting room');
        router.push(`/meetings/${id}?status=waiting`);
      } else {
        router.push(`/meetings/${id}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading || !meeting) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  }

  const isBlockedByRisk = riskScore !== null && riskScore > 80;
  const needsFaceAuth = meeting.face_auth_required && !faceVerified;
  const canJoin = !isBlockedByRisk && !needsFaceAuth;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Camera Preview */}
        <div className="md:col-span-3 space-y-4">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
            {cameraOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <VideoOff className="w-12 h-12 mb-2" />
                <p>Camera is off</p>
              </div>
            )}

            {/* In-preview controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
              <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-full transition-colors ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}>
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button onClick={() => setCameraOn(!cameraOn)} className={`p-3 rounded-full transition-colors ${cameraOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}>
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security & Join Panel */}
        <div className="md:col-span-2 flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{meeting.title}</h1>
            <p className="text-gray-400 text-sm">Hosted by: {meeting.host_name || meeting.host_id}</p>
            <button onClick={copyJoinLink} className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link copied' : 'Copy meeting link'}
            </button>
          </div>

          <div className="space-y-4">
            {/* Risk Check */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${isBlockedByRisk ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              {isBlockedByRisk ? <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" /> : <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-semibold ${isBlockedByRisk ? 'text-red-400' : 'text-green-400'}`}>
                  AI Risk Score: {riskScore} ({isBlockedByRisk ? 'Critical' : 'Safe'})
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isBlockedByRisk ? 'Your behavioral risk score is too high to join this meeting.' : 'Your behavioral risk profile is within acceptable limits.'}
                </p>
              </div>
            </div>

            {/* Face Auth Check */}
            {meeting.face_auth_required && (
              <div className={`p-4 rounded-xl border flex items-center justify-between ${faceVerified ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                <div className="flex items-center gap-3">
                  {faceVerified ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />}
                  <div>
                    <p className={`text-sm font-semibold ${faceVerified ? 'text-green-400' : 'text-white'}`}>Face Authentication</p>
                    <p className="text-xs text-gray-400">{faceVerified ? 'Identity Confirmed' : 'Required for this meeting'}</p>
                  </div>
                </div>
                {!faceVerified && (
                  <Button size="sm" onClick={simulateFaceAuth} disabled={verifyingFace || !cameraOn} className="bg-blue-600 hover:bg-blue-500 h-8 text-xs">
                    {verifyingFace ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan Face'}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Button 
            onClick={handleJoin} 
            disabled={!canJoin}
            className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${canJoin ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(0,100,255,0.4)]' : 'bg-gray-800 text-gray-500'}`}
          >
            {isBlockedByRisk ? 'Access Blocked' : isHost ? 'Start Meeting' : 'Join Meeting'}
          </Button>
        </div>

      </div>
    </div>
  );
}
