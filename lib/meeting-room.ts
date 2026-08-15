'use client';

import Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';

export interface MeetingUser {
  id: string;
  name: string;
  role?: string;
}

export interface RemotePeerInfo {
  peerId: string;
  user: MeetingUser;
  isHost: boolean;
  stream?: MediaStream;
  cameraOn: boolean;
  micOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
}

export interface RoomChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
}

export interface RoomReaction {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
}

export interface MeetingRoomCallbacks {
  onReady: (peerId: string) => void;
  onParticipantJoined: (peer: RemotePeerInfo) => void;
  onParticipantUpdated: (peerId: string, patch: Partial<RemotePeerInfo>) => void;
  onParticipantLeft: (peerId: string) => void;
  onChatMessage: (msg: RoomChatMessage) => void;
  onReaction: (reaction: RoomReaction) => void;
  onMuteAll: () => void;
  onKicked: () => void;
  onEndMeeting: () => void;
  onError: (message: string) => void;
}

type RoomSignal =
  | { type: 'hello'; peerId: string; user: MeetingUser; isHost: boolean }
  | { type: 'welcome'; peers: { peerId: string; user: MeetingUser; isHost: boolean }[] }
  | { type: 'peer-joined'; peer: { peerId: string; user: MeetingUser; isHost: boolean } }
  | { type: 'peer-left'; peerId: string }
  | { type: 'chat'; id: string; text: string; senderId: string; senderName: string; time: string }
  | { type: 'reaction'; id: string; emoji: string; senderId: string; senderName: string }
  | { type: 'raise-hand'; peerId: string; raised: boolean }
  | { type: 'video-state'; peerId: string; cameraOn: boolean; micOn: boolean }
  | { type: 'screen-share'; peerId: string; active: boolean }
  | { type: 'mute-all'; hostId: string }
  | { type: 'kick' }
  | { type: 'end-meeting' };

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class MeetingRoomClient {
  private peer: Peer | null = null;
  private dataConns = new Map<string, DataConnection>();
  private mediaConns = new Map<string, MediaConnection>();
  private peers = new Map<string, RemotePeerInfo>();
  private hostPeerId = '';
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private destroyed = false;
  private cameraEnabled = true;
  private micEnabled = true;

  constructor(
    private readonly opts: {
      meetingId: string;
      user: MeetingUser;
      isHost: boolean;
      callbacks: MeetingRoomCallbacks;
    }
  ) {}

  private get roomId() {
    return `cyber-meet-${this.opts.meetingId}`;
  }

  private get randomId() {
    return `${this.roomId}-${Math.random().toString(36).slice(2, 10)}`;
  }

  get isConnected() {
    return !!this.peer && this.peer.open;
  }

  get videoState() {
    return { cameraOn: this.cameraEnabled, micOn: this.micEnabled };
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
  }

  getConnectionState(peerId: string): RTCPeerConnectionState {
    return this.mediaConns.get(peerId)?.peerConnection?.connectionState ?? 'new';
  }

  join() {
    const peerId = this.opts.isHost ? this.roomId : this.randomId;
    const peer = new Peer(peerId, {
      debug: 0,
      config: { iceServers: ICE_SERVERS },
    });
    this.peer = peer;
    this.hostPeerId = this.roomId;
    this.attachPeerHandlers();
  }

  private attachPeerHandlers() {
    const peer = this.peer!;
    peer.on('open', (id) => {
      if (this.destroyed) return;
      this.opts.callbacks.onReady(id);
      if (!this.opts.isHost) this.dialHost();
    });
    peer.on('connection', (conn) => this.handleIncomingData(conn));
    peer.on('call', (call) => this.handleIncomingCall(call));
    peer.on('error', (err: { type?: string; message?: string }) => {
      if (err?.type === 'unavailable-id') {
        this.recreateAsParticipant();
        return;
      }
      if (err?.type === 'peer-unavailable' || err?.type === 'network' || err?.type === 'server-error') {
        return;
      }
      if (this.destroyed) return;
      this.opts.callbacks.onError(err?.message || 'Connection error');
    });
    peer.on('close', () => this.cleanup());
  }

  private recreateAsParticipant() {
    this.peer?.destroy();
    this.peer = null;
    this.peers.clear();
    this.dataConns.clear();
    this.mediaConns.clear();
    if (this.destroyed) return;
    const peer = new Peer(this.randomId, {
      debug: 0,
      config: { iceServers: ICE_SERVERS },
    });
    this.peer = peer;
    this.attachPeerHandlers();
  }

  private dialHost(attempt = 0) {
    if (this.destroyed || !this.peer) return;
    if (attempt >= 12) {
      this.opts.callbacks.onError('Could not reach the meeting host. The meeting may have ended.');
      return;
    }
    if (this.dataConns.has(this.hostPeerId)) return;
    const conn = this.peer.connect(this.hostPeerId, {
      reliable: true,
      metadata: { user: this.opts.user, isHost: this.opts.isHost },
    });
    this.bindDataConnection(conn);
    let errored = false;
    conn.on('open', () => {
      if (this.localStream) this.dialMedia(this.hostPeerId);
    });
    conn.on('error', () => {
      if (errored) return;
      errored = true;
      this.dataConns.delete(this.hostPeerId);
      if (!this.destroyed) setTimeout(() => this.dialHost(attempt + 1), 2000);
    });
    conn.on('close', () => {
      this.dataConns.delete(this.hostPeerId);
      this.handlePeerDisconnect(this.hostPeerId);
      if (!this.destroyed) setTimeout(() => this.dialHost(0), 2000);
    });
  }

  private handleIncomingData(conn: DataConnection) {
    this.dataConns.set(conn.peer, conn);
    conn.on('data', (raw) => this.handleSignal(conn.peer, raw));
    conn.on('close', () => {
      this.dataConns.delete(conn.peer);
      this.handlePeerDisconnect(conn.peer);
    });
    conn.on('error', () => {});
  }

  private handleIncomingCall(call: MediaConnection) {
    call.answer(this.localStream ?? undefined);
    this.bindMediaConnection(call.peer, call);
  }

  private dialPeer(peerId: string) {
    if (!this.peer || peerId === this.peer.id) return;
    if (this.dataConns.has(peerId)) {
      this.dialMedia(peerId);
      return;
    }
    const conn = this.peer.connect(peerId, {
      reliable: true,
      metadata: { user: this.opts.user, isHost: this.opts.isHost },
    });
    this.bindDataConnection(conn);
    conn.on('open', () => this.dialMedia(peerId));
  }

  private dialMedia(peerId: string) {
    if (!this.peer || !this.localStream) return;
    if (this.mediaConns.has(peerId)) return;
    try {
      const call = this.peer.call(peerId, this.localStream, {
        metadata: { user: this.opts.user },
      });
      this.bindMediaConnection(peerId, call);
    } catch {
      // Remote peer no longer reachable
    }
  }

  private bindDataConnection(conn: DataConnection) {
    this.dataConns.set(conn.peer, conn);
    conn.on('open', () => {
      if (this.destroyed || !this.peer) return;
      this.sendOn(conn, {
        type: 'hello',
        peerId: this.peer.id,
        user: this.opts.user,
        isHost: this.opts.isHost,
      });
      this.sendOn(conn, {
        type: 'video-state',
        peerId: this.peer.id,
        cameraOn: this.cameraEnabled,
        micOn: this.micEnabled,
      });
    });
    conn.on('data', (raw) => this.handleSignal(conn.peer, raw));
    conn.on('close', () => {
      this.dataConns.delete(conn.peer);
      this.handlePeerDisconnect(conn.peer);
    });
    conn.on('error', () => {});
  }

  private bindMediaConnection(peerId: string, call: MediaConnection) {
    if (this.mediaConns.has(peerId)) return;
    this.mediaConns.set(peerId, call);
    call.on('stream', (stream) => {
      this.patchPeer(peerId, { stream });
    });
    call.on('close', () => {
      this.mediaConns.delete(peerId);
      this.patchPeer(peerId, { stream: undefined });
      this.handlePeerDisconnect(peerId);
    });
    call.on('error', () => {});
  }

  private handleSignal(fromPeer: string, raw: unknown) {
    if (this.destroyed) return;
    let msg: RoomSignal;
    try {
      msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as RoomSignal);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'hello': {
        this.upsertPeer({ peerId: msg.peerId, user: msg.user, isHost: !!msg.isHost });
        if (this.opts.isHost && this.peer) {
          this.broadcast({
            type: 'peer-joined',
            peer: { peerId: msg.peerId, user: msg.user, isHost: !!msg.isHost },
          });
          const others = [...this.peers.values()]
            .filter((p) => p.peerId !== msg.peerId)
            .map((p) => ({ peerId: p.peerId, user: p.user, isHost: p.isHost }));
          this.sendTo(msg.peerId, { type: 'welcome', peers: others });
        }
        break;
      }
      case 'welcome': {
        for (const p of msg.peers) {
          if (!this.peer || p.peerId === this.peer.id || this.peers.has(p.peerId)) continue;
          this.upsertPeer({ peerId: p.peerId, user: p.user, isHost: !!p.isHost });
          this.dialPeer(p.peerId);
        }
        break;
      }
      case 'peer-joined': {
        this.upsertPeer({ peerId: msg.peer.peerId, user: msg.peer.user, isHost: !!msg.peer.isHost });
        break;
      }
      case 'peer-left': {
        this.handlePeerDisconnect(msg.peerId);
        break;
      }
      case 'chat': {
        this.opts.callbacks.onChatMessage({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          text: msg.text,
          time: msg.time,
        });
        break;
      }
      case 'reaction': {
        this.opts.callbacks.onReaction({
          id: msg.id,
          emoji: msg.emoji,
          senderId: msg.senderId,
          senderName: msg.senderName,
        });
        break;
      }
      case 'raise-hand': {
        this.patchPeer(msg.peerId, { handRaised: msg.raised });
        break;
      }
      case 'video-state': {
        this.patchPeer(msg.peerId, { cameraOn: msg.cameraOn, micOn: msg.micOn });
        break;
      }
      case 'screen-share': {
        this.patchPeer(msg.peerId, { screenSharing: msg.active });
        break;
      }
      case 'mute-all': {
        if (msg.hostId !== this.opts.user.id) this.opts.callbacks.onMuteAll();
        break;
      }
      case 'kick': {
        this.opts.callbacks.onKicked();
        break;
      }
      case 'end-meeting': {
        this.opts.callbacks.onEndMeeting();
        break;
      }
    }
  }

  private upsertPeer(info: Pick<RemotePeerInfo, 'peerId' | 'user' | 'isHost'>) {
    const existing = this.peers.get(info.peerId);
    if (existing) {
      this.patchPeer(info.peerId, { user: info.user, isHost: info.isHost });
    } else {
      const next: RemotePeerInfo = {
        ...info,
        cameraOn: true,
        micOn: true,
        screenSharing: false,
        handRaised: false,
      };
      this.peers.set(info.peerId, next);
      this.opts.callbacks.onParticipantJoined(next);
    }
  }

  private patchPeer(peerId: string, patch: Partial<RemotePeerInfo>) {
    const existing = this.peers.get(peerId);
    if (!existing) return;
    const next = { ...existing, ...patch };
    this.peers.set(peerId, next);
    this.opts.callbacks.onParticipantUpdated(peerId, patch);
  }

  private handlePeerDisconnect(peerId: string) {
    if (!this.peers.has(peerId)) return;
    this.peers.delete(peerId);
    this.dataConns.delete(peerId);
    this.mediaConns.delete(peerId);
    this.broadcast({ type: 'peer-left', peerId });
    this.opts.callbacks.onParticipantLeft(peerId);
  }

  // ---- Control methods ----

  setCameraEnabled(enabled: boolean) {
    this.cameraEnabled = enabled;
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    this.broadcast({
      type: 'video-state',
      peerId: this.peer?.id ?? '',
      cameraOn: enabled,
      micOn: this.micEnabled,
    });
  }

  setMicEnabled(enabled: boolean) {
    this.micEnabled = enabled;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    this.broadcast({
      type: 'video-state',
      peerId: this.peer?.id ?? '',
      cameraOn: this.cameraEnabled,
      micOn: enabled,
    });
  }

  startScreenShare(displayStream: MediaStream) {
    this.stopScreenShare();
    this.screenStream = displayStream;
    const videoTrack = displayStream.getVideoTracks()[0];
    if (videoTrack) {
      this.replaceVideoTrack(videoTrack);
      videoTrack.onended = () => this.stopScreenShare();
    }
    this.broadcast({ type: 'screen-share', peerId: this.peer?.id ?? '', active: true });
  }

  stopScreenShare() {
    if (!this.screenStream) return;
    const camTrack = this.localStream?.getVideoTracks()[0] ?? null;
    this.replaceVideoTrack(camTrack);
    this.screenStream.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.broadcast({ type: 'screen-share', peerId: this.peer?.id ?? '', active: false });
  }

  private replaceVideoTrack(track: MediaStreamTrack | null) {
    for (const mc of this.mediaConns.values()) {
      try {
        const sender = mc.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) void sender.replaceTrack(track);
      } catch {
        // Ignore per-connection failures
      }
    }
  }

  sendChat(text: string): RoomChatMessage {
    const msg: RoomChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: this.opts.user.id,
      senderName: this.opts.user.name,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.broadcast({
      type: 'chat',
      id: msg.id,
      text,
      senderId: msg.senderId,
      senderName: msg.senderName,
      time: msg.time,
    });
    return msg;
  }

  sendReaction(emoji: string): RoomReaction {
    const reaction: RoomReaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      emoji,
      senderId: this.opts.user.id,
      senderName: this.opts.user.name,
    };
    this.broadcast({
      type: 'reaction',
      id: reaction.id,
      emoji,
      senderId: reaction.senderId,
      senderName: reaction.senderName,
    });
    return reaction;
  }

  setHandRaised(raised: boolean) {
    this.broadcast({ type: 'raise-hand', peerId: this.peer?.id ?? '', raised });
  }

  muteAll() {
    this.broadcast({ type: 'mute-all', hostId: this.opts.user.id });
  }

  kick(peerId: string) {
    this.sendTo(peerId, { type: 'kick' });
    this.handlePeerDisconnect(peerId);
  }

  endMeeting() {
    this.broadcast({ type: 'end-meeting' });
    this.leave();
  }

  leave() {
    this.destroyed = true;
    try {
      this.broadcast({ type: 'peer-left', peerId: this.peer?.id ?? '' });
    } catch {
      // ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // ignore
    }
    this.peer = null;
    this.dataConns.clear();
    this.mediaConns.clear();
    this.peers.clear();
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
  }

  private broadcast(msg: RoomSignal) {
    for (const [id, conn] of this.dataConns) {
      if (id === this.peer?.id) continue;
      try {
        if (conn.open) conn.send(msg);
      } catch {
        // ignore
      }
    }
  }

  private sendTo(peerId: string, msg: RoomSignal) {
    const conn = this.dataConns.get(peerId);
    try {
      if (conn?.open) conn.send(msg);
    } catch {
      // ignore
    }
  }

  private sendOn(conn: DataConnection, msg: RoomSignal) {
    try {
      if (conn.open) conn.send(msg);
    } catch {
      // ignore
    }
  }

  private cleanup() {
    this.dataConns.clear();
    this.mediaConns.clear();
    this.peers.clear();
  }
}
