'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { MeetingRoomClient, RoomChatMessage, RoomReaction, RemotePeerInfo } from '@/lib/meeting-room';
import {
  Loader2, Mic, MicOff, Video, VideoOff, MonitorUp, MonitorStop, MessageSquare, Users,
  PhoneOff, Circle, MoreVertical, Send, Hand, Sparkles, Copy, Check, Maximize2, Minimize2,
  Captions, X, ShieldAlert, UserPlus, Presentation, Search, LogOut, LayoutGrid, VideoIcon
} from 'lucide-react';

type Phase = 'loading' | 'waiting' | 'connecting' | 'call';

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function initials(name?: string) {
  return (name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function useAudioLevels(streams: { id: string; stream?: MediaStream }[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || streams.length === 0) return;
    const AudioCtx: any = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    let ctx: AudioContext | null = null;
    let disposed = false;
    try {
      ctx = new AudioCtx();
      const analysers = new Map<string, { analyser: AnalyserNode; data: Float32Array<ArrayBuffer> }>();
      const nodes: AudioNode[] = [];
      for (const s of streams) {
        if (!s.stream) continue;
        const source = (ctx as any).createMediaStreamSource(s.stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        nodes.push(source, analyser);
        analysers.set(s.id, { analyser, data: new Float32Array(analyser.fftSize) });
      }
      const iv = window.setInterval(() => {
        let maxLevel = 0.025;
        let maxId: string | null = null;
        for (const [id, { analyser, data }] of analysers) {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length);
          if (rms > maxLevel) {
            maxLevel = rms;
            maxId = id;
          }
        }
        if (!disposed) setActiveId(maxId);
      }, 600);
      return () => {
        disposed = true;
        clearInterval(iv);
        nodes.forEach((n) => { try { n.disconnect(); } catch { /* noop */ } });
        if (ctx) { try { void ctx.close(); } catch { /* noop */ } }
      };
    } catch {
      return () => { disposed = true; };
    }
  }, [streams]);
  return activeId;
}

interface ApiParticipant {
  user_id: string;
  status: string;
  user_name?: string;
}

function MeetingRoomInner() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('loading');
  const [waitMessage, setWaitMessage] = useState('');

  // Media
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Call state
  const [participants, setParticipants] = useState<RemotePeerInfo[]>([]);
  const [apiParticipants, setApiParticipants] = useState<ApiParticipant[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'captions' | null>(null);
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState<{ time: string; text: string }[]>([]);
  const [layout, setLayout] = useState<'grid' | 'speaker'>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [connStates, setConnStates] = useState<Record<string, string>>({});

  const clientRef = useRef<MeetingRoomClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<RoomChatMessage[]>([]);
  const joinedAtRef = useRef<number | null>(null);

  const isHost = !!meeting && meeting.host_id === user?.id;
  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/meetings/${id}/pre-join` : '';

  // ---------- Helpers ----------

  const setLocalStreamState = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const showError = useCallback((msg: string) => {
    toast.error(msg);
  }, []);

  const cleanupConnection = useCallback(() => {
    clientRef.current?.leave();
    clientRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
  }, []);

  const leaveRoom = useCallback(async (endForAll: boolean) => {
    cleanupConnection();
    try {
      if (endForAll) {
        await fetch(`/api/meetings/${id}/end`, {
          method: 'POST'
        });
      } else {
        await fetch(`/api/meetings/${id}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id })
        });
      }
    } catch { /* noop */ }
    router.push('/meetings');
  }, [cleanupConnection, id, router, user?.id]);

  // ---------- Load meeting ----------

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!id || id === 'undefined') return;
      try {
        const res = await fetch(`/api/meetings/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (cancelled) return;
        setMeeting(data.data);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load meeting');
        router.push('/meetings');
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      cleanupConnection();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- Get local media ----------

  useEffect(() => {
    if (loading || !meeting) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStreamState(stream);
      } catch {
        toast.error('Could not access camera/microphone. Joining without media.');
        setLocalStreamState(null);
        setCameraOn(false);
        setMicOn(false);
      } finally {
        if (!cancelled) setMediaReady(true);
      }
    };
    acquire();
    return () => {
      cancelled = true;
    };
  }, [loading, meeting, setLocalStreamState]);

  // ---------- Callbacks for the WebRTC client ----------

  const handleParticipantJoined = useCallback((peer: RemotePeerInfo) => {
    setParticipants((prev) => {
      if (prev.some((p) => p.peerId === peer.peerId)) return prev;
      return [...prev, peer];
    });
  }, []);

  const handleParticipantUpdated = useCallback((peerId: string, patch: Partial<RemotePeerInfo>) => {
    setParticipants((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, ...patch } : p))
    );
  }, []);

  const handleParticipantLeft = useCallback((peerId: string) => {
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const handleChatMessage = useCallback((msg: RoomChatMessage) => {
    messagesRef.current = [...messagesRef.current, msg];
    setMessages(messagesRef.current);
  }, []);

  const handleReaction = useCallback((r: RoomReaction) => {
    setReactions((prev) => [...prev, r]);
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((x) => x.id !== r.id));
    }, 3200);
  }, []);

  const handleMuteAll = useCallback(() => {
    setMicOn(false);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    toast.info('Host muted everyone');
  }, []);

  const handleKicked = useCallback(async () => {
    toast.error('You were removed from the meeting by the host');
    await leaveRoom(false);
  }, [leaveRoom]);

  const handleEndMeeting = useCallback(async () => {
    toast.info('The meeting has ended for everyone');
    await leaveRoom(false);
  }, [leaveRoom]);

  const handleClientError = useCallback((msg: string) => {
    showError(msg);
    setPhase((prev) => (prev === 'connecting' ? 'waiting' : prev));
  }, [showError]);

  const startCall = useCallback(() => {
    if (clientRef.current) return;
    const client = new MeetingRoomClient({
      meetingId: id,
      user: { id: user!.id, name: user!.full_name || user!.email, role: user!.role },
      isHost: isHost,
      callbacks: {
        onReady: () => {
          joinedAtRef.current = Date.now();
          setPhase('call');
          setMenuOpen(false);
        },
        onParticipantJoined: handleParticipantJoined,
        onParticipantUpdated: handleParticipantUpdated,
        onParticipantLeft: handleParticipantLeft,
        onChatMessage: handleChatMessage,
        onReaction: handleReaction,
        onMuteAll: handleMuteAll,
        onKicked: () => void handleKicked(),
        onEndMeeting: () => void handleEndMeeting(),
        onError: handleClientError,
      },
    });
    client.setLocalStream(localStreamRef.current);
    clientRef.current = client;
    client.join();
  }, [id, user, isHost, handleParticipantJoined, handleParticipantUpdated, handleParticipantLeft, handleChatMessage, handleReaction, handleMuteAll, handleKicked, handleEndMeeting, handleClientError]);

  // ---------- Join / phase management ----------

  useEffect(() => {
    if (!meeting || loading || !mediaReady) return;
    if (isHost) {
      // Host: make the meeting live and enter the call
      void fetch(`/api/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE' }),
      }).catch(() => {});
      setPhase('connecting');
      startCall();
      return;
    }

    // Non-host: wait until the meeting is live and we are admitted
    setPhase('waiting');
    setWaitMessage('Preparing your connection...');
    const check = async () => {
      try {
        const res = await fetch(`/api/meetings/${id}/join-status?user_id=${user!.id}`);
        const data = await res.json();
        const s = data.data;
        if (s.participant_status === 'DENIED') {
          toast.error('The host did not let you in');
          router.push('/meetings');
          return;
        }
        if (s.participant_status === 'IN_CALL' && s.meeting_status === 'LIVE') {
          clearInterval(iv);
          setPhase('connecting');
          startCall();
          return;
        }
        setPhase('waiting');
        if (s.participant_status === 'WAITING') {
          setWaitMessage(`Waiting for the host to let you into "${meeting.title}"...`);
        } else if (s.meeting_status !== 'LIVE') {
          setWaitMessage('Waiting for the host to start the meeting...');
        } else {
          setWaitMessage('Preparing your connection...');
        }
      } catch { /* retry */ }
    };

    // If we arrived flagged as waiting (or not yet live), start polling
    const shouldWait = searchParams.get('status') === 'waiting';
    const iv = window.setInterval(check, 3000);
    if (shouldWait) {
      setPhase('waiting');
      setWaitMessage(`Waiting for the host to let you into "${meeting.title}"...`);
    } else {
      check();
    }
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, loading, mediaReady, isHost, id]);

  // ---------- Connection states polling ----------

  useEffect(() => {
    if (phase !== 'call') return;
    const poll = () => {
      const next: Record<string, string> = {};
      participants.forEach((p) => {
        next[p.peerId] = clientRef.current?.getConnectionState(p.peerId) || 'new';
      });
      setConnStates(next);
    };
    poll();
    const iv = window.setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [phase, participants]);

  // ---------- Timer ----------

  useEffect(() => {
    if (phase !== 'call') return;
    const iv = window.setInterval(() => {
      if (joinedAtRef.current) {
        setElapsed(Math.floor((Date.now() - joinedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // ---------- Host: poll waiting room ----------

  useEffect(() => {
    if (!isHost || phase !== 'call') return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/meetings/${id}`);
        const data = await res.json();
        if (data.data?.participants) {
          setApiParticipants(
            data.data.participants.filter((p: ApiParticipant) => p.status === 'WAITING')
          );
        }
      } catch { /* noop */ }
    };
    poll();
    const iv = window.setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [isHost, id, phase]);

  // ---------- Fullscreen ----------

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ---------- Live captions ----------

  const toggleCaptions = () => {
    if (!captionsOn) {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        toast.error('Live captions are not supported in this browser.');
        return;
      }
    }
    setCaptionsOn(!captionsOn);
  };

  useEffect(() => {
    if (!captionsOn) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setTranscript((prev) => [...prev.slice(-200), { time, text: t.trim() }]);
        } else {
          interimText += t;
        }
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      if (captionsOn) {
        try { rec.start(); } catch { /* noop */ }
      }
    };
    try { rec.start(); } catch { /* noop */ }
    recognitionRef.current = rec;
    return () => {
      try { rec.onend = null; rec.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, [captionsOn]);

  // ---------- Audio activity for speaker highlight ----------

  const streamList = useMemo(
    () => participants.map((p) => ({ id: p.peerId, stream: p.stream })),
    [participants]
  );
  const speakingPeerId = useAudioLevels(streamList);

  // ---------- Controls ----------

  const applyMic = (on: boolean) => {
    setMicOn(on);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    clientRef.current?.setMicEnabled(on);
  };

  const applyCamera = (on: boolean) => {
    setCameraOn(on);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = on));
    clientRef.current?.setCameraEnabled(on);
  };

  const toggleScreenShare = async () => {
    if (screenShareActive) {
      clientRef.current?.stopScreenShare();
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setScreenShareActive(false);
      return;
    }

    // Check if we are running in the React Native Expo App Wrapper
    if (typeof window !== 'undefined' && (window as any).requestNativeScreenshare) {
       (window as any).requestNativeScreenshare();
       return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = display;
      setScreenStream(display);
      setScreenShareActive(true);
      clientRef.current?.startScreenShare(display);
      toast.success('You are presenting your screen');
    } catch {
      toast.info('Screen sharing cancelled');
    }
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    clientRef.current?.setHandRaised(next);
    if (next) toast.success('You raised your hand');
  };

  const sendReaction = (emoji: string) => {
    const r = clientRef.current?.sendReaction(emoji);
    if (r) handleReaction(r);
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const msg = clientRef.current?.sendChat(chatText.trim());
    if (msg) handleChatMessage(msg);
    setChatText('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      toast.info('Recording stopped. Saving file...');
      return;
    }
    try {
      const stream = new MediaStream();
      localStreamRef.current?.getAudioTracks().forEach((t) => stream.addTrack(t));
      const videoTrack =
        screenStreamRef.current?.getVideoTracks()[0] ||
        localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) stream.addTrack(videoTrack);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(meeting?.title || 'meeting').replace(/[^\w\s-]/g, '')}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Recording saved to downloads');
      };
      rec.start();
      recorderRef.current = rec;
      setIsRecording(true);
      toast.success('Recording started');
    } catch {
      toast.error('Recording is not supported in this browser');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      toast.success('Meeting link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const admitUser = async (userId: string, approve: boolean) => {
    try {
      await fetch(`/api/meetings/${id}/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, approve }),
      });
      setApiParticipants((prev) =>
        prev.filter((p) => p.user_id !== userId || !approve)
      );
      if (approve) toast.success('Participant admitted');
    } catch {
      toast.error('Failed to update');
    }
  };

  const searchInvitees = async (q: string) => {
    setInviteQuery(q);
    if (!q.trim()) {
      setInviteResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(q.trim())}&limit=12`);
      const data = await res.json();
      setInviteResults(Array.isArray(data.data) ? data.data : []);
    } catch {
      setInviteResults([]);
    }
  };

  const inviteUser = async (targetId: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetId }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Invitation sent');
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  const handleHostEndMeeting = () => {
    if (window.confirm('End the meeting for everyone?')) {
      void leaveRoom(true);
    }
  };

  const removeParticipant = async (peer: RemotePeerInfo) => {
    if (window.confirm(`Remove ${peer.user.name} from the meeting?`)) {
      clientRef.current?.kick(peer.peerId);
      // Persist to backend
      try {
        await fetch(`/api/meetings/${id}/kick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: peer.user.id }),
        });
      } catch { /* noop */ }
    }
  };

  const muteAll = () => {
    clientRef.current?.muteAll();
    toast.success('Muted everyone (except you)');
  };

  // ---------- Renders ----------

  const selfTile = (
    <VideoTile
      key="self"
      name={user?.full_name || 'You'}
      stream={screenShareActive ? screenStream : localStream}
      cameraOn={cameraOn && !screenShareActive}
      micOn={micOn}
      isSelf
      isHost={isHost}
      isScreenSharing={screenShareActive}
      handRaised={handRaised}
      onStopShare={toggleScreenShare}
      presenting={screenShareActive}
    />
  );

  const remoteTiles = participants.map((p) => (
    <VideoTile
      key={p.peerId}
      name={p.user.name}
      stream={p.stream}
      cameraOn={p.cameraOn}
      micOn={p.micOn}
      isHost={p.isHost}
      isScreenSharing={p.screenSharing}
      handRaised={p.handRaised}
      speaking={speakingPeerId === p.peerId}
      connectionState={connStates[p.peerId] || 'new'}
    />
  ));

  const allTiles = [selfTile, ...remoteTiles];

  const spotlight =
    participants.find((p) => p.screenSharing) ||
    (speakingPeerId ? participants.find((p) => p.peerId === speakingPeerId) : undefined) ||
    participants[0];

  const renderMainStage = () => {
    if (layout === 'grid') {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 auto-rows-fr">
            {allTiles}
          </div>
        </div>
      );
    }
    // Speaker view
    const mainTile = spotlight;
    const rest = participants.filter((p) => !mainTile || p.peerId !== mainTile.peerId);
    return (
      <div className="flex-1 relative p-4 overflow-hidden">
        {mainTile ? (
          <VideoTile
            key={mainTile.peerId}
            name={mainTile.user.name}
            stream={mainTile.stream}
            cameraOn={mainTile.cameraOn}
            micOn={mainTile.micOn}
            isHost={mainTile.isHost}
            isScreenSharing={mainTile.screenSharing}
            handRaised={mainTile.handRaised}
            speaking={speakingPeerId === mainTile.peerId}
            connectionState={connStates[mainTile.peerId] || 'new'}
            className="absolute inset-0"
          />
        ) : (
          selfTile
        )}
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 max-h-[60%] overflow-y-auto w-44 z-10">
          {rest.map((p) => (
            <VideoTile
              key={p.peerId}
              name={p.user.name}
              stream={p.stream}
              cameraOn={p.cameraOn}
              micOn={p.micOn}
              isHost={p.isHost}
              isScreenSharing={p.screenSharing}
              handRaised={p.handRaised}
              speaking={speakingPeerId === p.peerId}
              small
            />
          ))}
        </div>
      </div>
    );
  };

  const connectedCount = participants.length + 1;

  // Waiting room screen (non-host)
  if (phase === 'waiting') {
    return (
      <div className="h-screen bg-[#0f0f0f] text-white flex flex-col">
        <div className="h-14 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">{meeting?.title}</h2>
              <p className="text-xs text-gray-400">Secure waiting room</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => leaveRoom(false)} className="border-white/10">
            <LogOut className="w-4 h-4 mr-2" /> Leave
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-full max-w-md aspect-video bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center">
            {cameraOn && localStream ? (
              <video 
                ref={(el) => { 
                  if (el && el.srcObject !== localStream) {
                    el.srcObject = localStream;
                    el.play().catch(() => {});
                  }
                }} 
                autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" 
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold">
                {initials(user?.full_name)}
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
              {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              {user?.full_name}
            </div>
          </div>
          <div className="text-center max-w-md">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">You&apos;re in the waiting room</h1>
            <p className="text-gray-400 text-sm">{waitMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'connecting' || !meeting) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            {phase === 'connecting' ? 'Connecting you securely...' : 'Loading meeting...'}
          </p>
        </div>
      </div>
    );
  }

  // Active call UI
  return (
    <div className="h-screen bg-[#0f0f0f] flex flex-col text-white overflow-hidden">
      {/* Top bar */}
      <div className="h-14 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate">{meeting.title}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {isRecording && (
                <span className="flex items-center gap-1 text-red-400">
                  <Circle className="w-2 h-2 fill-current animate-pulse" /> REC
                </span>
              )}
              <span>{formatDuration(elapsed)}</span>
              <span>• {connectedCount} {connectedCount === 1 ? 'participant' : 'participants'}</span>
              <span>• E2EE Secured</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLayout(layout === 'grid' ? 'speaker' : 'grid')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors" title={layout === 'grid' ? 'Switch to speaker view' : 'Switch to grid view'}>
            <LayoutGrid className="w-[18px] h-[18px]" />
          </button>
          <button onClick={toggleFullscreen} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating reactions */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {reactions.map((r) => (
            <div key={r.id} className="absolute bottom-40 left-1/2 -translate-x-1/2 animate-[floatup_1.5s_ease-out_forwards] text-5xl drop-shadow-lg">
              {r.emoji}
            </div>
          ))}
        </div>

        <div className={`flex-1 flex flex-col transition-all duration-300 relative ${activeTab ? 'lg:mr-80' : ''}`}>
          {renderMainStage()}

          {/* Captions overlay */}
          {captionsOn && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-20 text-center">
              <div className="bg-black/70 backdrop-blur-md rounded-2xl px-5 py-3 text-base leading-relaxed inline-block max-w-full">
                <span>{interim}</span>
                {transcript.length > 0 && (
                  <div className="text-gray-300">{transcript[transcript.length - 1].text}</div>
                )}
              </div>
            </div>
          )}

          {/* Bottom control bar */}
          <div className="h-24 shrink-0 flex items-center justify-center gap-3 relative z-30">
            <ControlButton onClick={() => applyMic(!micOn)} active={micOn} danger={!micOn} title={micOn ? 'Mute microphone' : 'Unmute microphone'}>
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </ControlButton>
            <ControlButton onClick={() => applyCamera(!cameraOn)} active={cameraOn} danger={!cameraOn} title={cameraOn ? 'Turn off camera' : 'Turn on camera'}>
              {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </ControlButton>
            <ControlButton onClick={toggleScreenShare} active={screenShareActive} highlight title={screenShareActive ? 'Stop presenting' : 'Present your screen'}>
              {screenShareActive ? <MonitorStop className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            </ControlButton>
            <ControlButton onClick={toggleHand} active={handRaised} highlight={handRaised} title={handRaised ? 'Lower hand' : 'Raise hand'}>
              <Hand className="w-5 h-5" />
            </ControlButton>

            {/* Reactions */}
            <div className="relative">
              <button onClick={() => sendReaction('👍')} className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#4d5154] flex items-center justify-center transition-colors" title="Thumbs up">
                <Sparkles className="w-5 h-5" />
              </button>
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1 bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-1.5 shadow-2xl opacity-0 hover:opacity-100 transition-opacity z-40">
                {['👍', '👏', '❤️', '😂', '😮', '🎉'].map((e) => (
                  <button key={e} onClick={() => sendReaction(e)} className="text-xl hover:scale-125 transition-transform px-0.5">{e}</button>
                ))}
              </div>
            </div>

            {/* More menu */}
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#4d5154] flex items-center justify-center transition-colors" title="More options">
                <MoreVertical className="w-5 h-5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-64 bg-[#202020] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                    <MenuItem onClick={toggleRecording} icon={<Circle className={`w-4 h-4 ${isRecording ? 'text-red-400' : ''}`} />} label={isRecording ? 'Stop recording' : 'Record meeting'} />
                    <MenuItem onClick={() => { toggleCaptions(); setMenuOpen(false); }} icon={<Captions className={`w-4 h-4 ${captionsOn ? 'text-blue-400' : ''}`} />} label={captionsOn ? 'Turn off captions' : 'Turn on captions'} />
                    <MenuItem onClick={() => { void copyLink(); setMenuOpen(false); }} icon={<Copy className="w-4 h-4" />} label="Copy meeting link" />
                    <MenuItem onClick={toggleFullscreen} icon={<Maximize2 className="w-4 h-4" />} label="Fullscreen" />
                    {isHost && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <MenuItem onClick={muteAll} icon={<MicOff className="w-4 h-4" />} label="Mute everyone" />
                        <MenuItem onClick={() => { setInviteOpen(true); setMenuOpen(false); }} icon={<UserPlus className="w-4 h-4" />} label="Add people" />
                        <MenuItem onClick={handleHostEndMeeting} icon={<LogOut className="w-4 h-4 text-red-400" />} label="End meeting for all" danger />
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Leave / End */}
            <button
              onClick={() => {
                if (isHost) {
                  handleHostEndMeeting();
                } else {
                  void leaveRoom(false);
                }
              }}
              className="h-12 px-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 transition-colors"
              title={isHost ? 'End meeting for all' : 'Leave meeting'}
            >
              <PhoneOff className="w-5 h-5" />
              {isHost && <span className="text-sm hidden sm:inline">End</span>}
            </button>

            {/* Sidebar toggles */}
            <div className="hidden sm:flex items-center gap-2 absolute right-3">
              <ControlButton onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} active={activeTab === 'chat'} title="In-call messages">
                <MessageSquare className="w-5 h-5" />
              </ControlButton>
              <ControlButton onClick={() => setActiveTab(activeTab === 'participants' ? null : 'participants')} active={activeTab === 'participants'} title="Participants">
                <Users className="w-5 h-5" />
              </ControlButton>
              <ControlButton onClick={() => setActiveTab(activeTab === 'captions' ? null : 'captions')} active={activeTab === 'captions'} title="Captions">
                <Captions className="w-5 h-5" />
              </ControlButton>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {activeTab && (
          <div className="w-full lg:w-80 bg-[#1a1a1a] border-l border-white/5 flex flex-col absolute inset-y-0 right-0 z-20">
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
              <h3 className="font-semibold text-sm">
                {activeTab === 'chat' ? 'In-call messages' : activeTab === 'participants' ? `People (${connectedCount})` : 'Live captions'}
              </h3>
              <button onClick={() => setActiveTab(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'chat' && (
                <div className="p-4 space-y-4">
                  <div className="bg-blue-500/10 text-blue-400 text-xs p-3 rounded-lg border border-blue-500/20 text-center">
                    Messages are end-to-end encrypted and deleted when the meeting ends.
                  </div>
                  {messages.length === 0 && (
                    <p className="text-xs text-gray-500 text-center pt-8">No messages yet. Start the conversation!</p>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm text-white">{m.senderName}</span>
                        <span className="text-[10px] text-gray-500">{m.time}</span>
                      </div>
                      <p data-copy-allowed className="text-sm text-gray-300 leading-relaxed bg-white/5 p-2 rounded-r-lg rounded-bl-lg w-fit">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="p-4 space-y-4">
                  <Button variant="outline" onClick={() => setInviteOpen(true)} className="w-full border-white/10 border-dashed text-xs">
                    <UserPlus className="w-4 h-4 mr-2" /> Add people
                  </Button>

                  <div className="space-y-1">
                    {/* Self */}
                    <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(user?.full_name)}
                        </div>
                        <span className="text-sm font-medium truncate">{user?.full_name} (You){isHost && <span className="ml-1 text-blue-400 text-xs">• Host</span>}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {handRaised && <Hand className="w-4 h-4 text-yellow-400" />}
                        {!micOn && <MicOff className="w-4 h-4 text-red-400" />}
                        {!cameraOn && <VideoOff className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>

                    {participants.map((p) => (
                      <div key={p.peerId} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(p.user.name)}
                          </div>
                          <span className="text-sm font-medium truncate">{p.user.name}{p.user.id === meeting.host_id && <span className="ml-1 text-blue-400 text-xs">• Host</span>}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.handRaised && <Hand className="w-4 h-4 text-yellow-400" />}
                          {!p.micOn && <MicOff className="w-4 h-4 text-red-400" />}
                          {!p.cameraOn && <VideoOff className="w-4 h-4 text-gray-500" />}
                          {p.screenSharing && <MonitorUp className="w-4 h-4 text-blue-400" />}
                          {isHost && (
                            <button onClick={() => removeParticipant(p)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove participant">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isHost && (
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Waiting Room ({apiParticipants.length})</h4>
                      {apiParticipants.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center">No one is waiting.</p>
                      ) : (
                        <div className="space-y-2">
                          {apiParticipants.map((p) => (
                            <div key={p.user_id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {initials(p.user_name)}
                                </div>
                                <span className="text-sm truncate">{p.user_name}</span>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" onClick={() => admitUser(p.user_id, true)} className="bg-green-600 hover:bg-green-500 h-7 text-xs px-3">
                                  <Check className="w-3.5 h-3.5 mr-1" /> Admit
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => admitUser(p.user_id, false)} className="h-7 text-xs px-2 text-red-400 hover:bg-red-500/10">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'captions' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Captions className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold">Live captions</span>
                    </div>
                    <Button size="sm" onClick={toggleCaptions} className="h-7 text-xs">
                      {captionsOn ? 'Turn off' : 'Turn on'}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Captions are generated from your microphone using your browser. Speak clearly for best results.
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg text-sm text-gray-300 leading-relaxed min-h-24 max-h-96 overflow-y-auto space-y-2">
                    {transcript.map((t, i) => (
                      <div key={i}>
                        <span className="text-gray-500 text-[10px] mr-2">[{t.time}]</span>{t.text}
                      </div>
                    ))}
                    {interim && <p className="text-gray-400 italic">{interim}...</p>}
                    {transcript.length === 0 && !interim && <p className="text-gray-600 text-xs">Captions will appear here while you speak.</p>}
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'chat' && (
              <form onSubmit={sendChat} className="p-4 border-t border-white/5 bg-[#1a1a1a] shrink-0">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Send a message..."
                    className="w-full bg-[#2a2a2a] border border-transparent focus:border-blue-500 rounded-full pl-4 pr-11 py-2.5 text-sm outline-none transition-colors"
                  />
                  <button type="submit" disabled={!chatText.trim()} className="absolute right-3 text-blue-500 disabled:text-gray-600">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Invite modal */}
        {inviteOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0b132b] border border-white/10 rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-400" /> Add people</h3>
                <button onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    value={inviteQuery}
                    onChange={(e) => searchInvitees(e.target.value)}
                    placeholder="Search employees to invite..."
                    className="w-full bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {inviteResults.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(emp.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{emp.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{emp.designation || emp.role || emp.email}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => inviteUser(emp.id)} className="bg-blue-600 hover:bg-blue-500 h-7 text-xs shrink-0">
                        Invite
                      </Button>
                    </div>
                  ))}
                  {inviteQuery.trim() && inviteResults.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-6">No employees found.</p>
                  )}
                  {!inviteQuery.trim() && (
                    <div className="text-center py-6">
                      <VideoIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-xs text-gray-500">Share the meeting link or search for someone to invite.</p>
                      <Button size="sm" variant="outline" onClick={() => void copyLink()} className="mt-3 border-white/10 text-xs">
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy link
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatup {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          20% { transform: translate(-50%, -30px) scale(1.1); opacity: 1; }
          80% { transform: translate(-50%, -120px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -180px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ---------- Subcomponents ----------

function ControlButton({
  children, onClick, active, danger, highlight, title, className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
  title?: string;
  className?: string;
}) {
  const bg = danger ? 'bg-red-500 hover:bg-red-600' : active ? 'bg-[#3c4043] hover:bg-[#4d5154]' : highlight ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#3c4043] hover:bg-[#4d5154]';
  return (
    <button onClick={onClick} title={title} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${bg} ${className}`}>
      {children}
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-left ${danger ? 'text-red-400' : ''}`}>
      {icon}
      {label}
    </button>
  );
}

function VideoTile({
  name, stream, cameraOn, micOn, isHost, isScreenSharing, handRaised, speaking, isSelf, onStopShare, presenting, small, connectionState, className = '',
}: {
  name: string;
  stream?: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  isHost?: boolean;
  isScreenSharing?: boolean;
  handRaised?: boolean;
  speaking?: boolean;
  isSelf?: boolean;
  onStopShare?: () => void;
  presenting?: boolean;
  small?: boolean;
  connectionState?: string;
  className?: string;
}) {
  const showVideo = !!stream && (cameraOn || isScreenSharing);
  return (
    <div className={`relative bg-[#202020] rounded-xl overflow-hidden border ${speaking ? 'border-blue-500' : 'border-white/5'} ${small ? 'aspect-video' : 'aspect-video'} ${className}`}>
      {showVideo ? (
        <video
          ref={(el) => { 
            if (el && el.srcObject !== stream) {
              el.srcObject = stream ?? null; 
              if (stream) el.play().catch(() => {});
            } 
          }}
          autoPlay
          playsInline
          muted={isSelf}
          className={`w-full h-full object-cover ${isSelf && !isScreenSharing ? 'transform -scale-x-100' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#202020]">
          <div className={`${small ? 'w-14 h-14 text-lg' : 'w-20 h-20 text-3xl'} rounded-full bg-blue-600 flex items-center justify-center font-bold`}>
            {initials(name)}
          </div>
        </div>
      )}

      {isScreenSharing && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5 text-blue-400" /> Presenting
        </div>
      )}
      {handRaised && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
          <Hand className="w-4 h-4 text-yellow-400" />
        </div>
      )}
      {isHost && (
        <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-semibold">
          HOST
        </div>
      )}

      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 max-w-[80%]">
        {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        <span className="truncate">{name}{isSelf ? ' (You)' : ''}</span>
      </div>

      {connectionState && connectionState !== 'connected' && connectionState !== 'new' && (
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-yellow-400">
          Connecting...
        </div>
      )}

      {presenting && onStopShare && (
        <button onClick={onStopShare} className="absolute bottom-14 right-3 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <MonitorStop className="w-3.5 h-3.5" /> Stop presenting
        </button>
      )}
    </div>
  );
}

export default function MeetingRoomPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    }>
      <MeetingRoomInner />
    </Suspense>
  );
}
