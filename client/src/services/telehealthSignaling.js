/**
 * ReMotion Real-Time Telehealth Telephony & WebRTC Signalling Service
 * 
 * Provides cross-laptop WebRTC communication for patient-therapist video consultations.
 * Uses WebRTC RTCPeerConnection, STUN/TURN configuration, and Cloudflare-backed WebSocket signalling.
 */

import { Peer } from 'peerjs';
import { api } from './api';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

class TelehealthSignalingService {
  constructor() {
    this.peer = null;
    this.peerId = null;
    this.currentCall = null;
    this.dataConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.listeners = new Set();
    this.incomingCallCallback = null;
    this.isInitialized = false;
    this.reconnectTimer = null;
    this.currentUser = null;
  }

  getIceServers() {
    const servers = [...DEFAULT_ICE_SERVERS];
    const turnUrl = import.meta.env?.VITE_TURN_SERVER_URL;
    const turnUser = import.meta.env?.VITE_TURN_USERNAME;
    const turnCred = import.meta.env?.VITE_TURN_CREDENTIAL;

    if (turnUrl && turnUser && turnCred) {
      servers.push({
        urls: turnUrl,
        username: turnUser,
        credential: turnCred
      });
    }
    return servers;
  }

  computePeerId(user) {
    if (!user) return null;
    if (user.role === 'therapist') {
      return `remotion-th-${user.id || 'u_therapist_1'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    const ptId = user.profile?.id || user.id || 'pt_1';
    return `remotion-pt-${ptId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  getTargetPeerId(targetUserOrPatientId, targetRole) {
    if (targetRole === 'therapist') {
      return `remotion-th-${targetUserOrPatientId || 'u_therapist_1'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    const cleanId = (targetUserOrPatientId || 'pt_1').replace('u_', '').replace('pt_', '');
    return `remotion-pt-pt_${cleanId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  initialize(user) {
    if (!user) return;
    this.currentUser = user;
    const desiredId = this.computePeerId(user);

    if (this.peer && this.peerId === desiredId && !this.peer.destroyed) {
      return;
    }

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.peerId = desiredId;
    console.log('[Telehealth] Initializing peer with ID:', desiredId);

    try {
      this.peer = new Peer(desiredId, {
        config: {
          iceServers: this.getIceServers(),
          iceTransportPolicy: 'all'
        },
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log('[Telehealth] WebRTC Signaling connected. ID:', id);
        this.isInitialized = true;
        this.notify('peer_ready', { peerId: id });
      });

      this.peer.on('call', (mediaCall) => {
        console.log('[Telehealth] Incoming WebRTC media call from:', mediaCall.peer, mediaCall.metadata);
        this.currentCall = mediaCall;

        if (this.incomingCallCallback) {
          this.incomingCallCallback(mediaCall);
        }
        this.notify('incoming_call', {
          call: mediaCall,
          metadata: mediaCall.metadata,
          callerPeerId: mediaCall.peer
        });
      });

      this.peer.on('connection', (conn) => {
        console.log('[Telehealth] WebRTC DataChannel connection from:', conn.peer);
        this.dataConnection = conn;
        this.setupDataConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('[Telehealth] Peer error:', err.type, err.message);
        if (err.type === 'unavailable-id') {
          // If ID collision occurs from a stale socket, reconnect with suffix
          setTimeout(() => {
            if (this.currentUser) {
              this.peer = new Peer(`${desiredId}_${Date.now().toString(36).slice(-3)}`, {
                config: { iceServers: this.getIceServers() }
              });
            }
          }, 1500);
        }
        this.notify('error', { error: err });
      });

      this.peer.on('disconnected', () => {
        console.log('[Telehealth] Peer disconnected from signaling server. Reconnecting...');
        if (this.peer && !this.peer.destroyed) {
          try { this.peer.reconnect(); } catch (e) {}
        }
      });
    } catch (err) {
      console.error('[Telehealth] Failed to construct Peer:', err);
    }
  }

  setupDataConnection(conn) {
    conn.on('data', (data) => {
      this.notify('data', data);
    });
    conn.on('close', () => {
      if (this.dataConnection === conn) this.dataConnection = null;
    });
  }

  sendData(payload) {
    if (this.dataConnection && this.dataConnection.open) {
      try {
        this.dataConnection.send(payload);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  setIncomingCallHandler(callback) {
    this.incomingCallCallback = callback;
  }

  // Dial remote participant
  dialCall(targetPeerId, stream, metadata = {}) {
    if (!this.peer || this.peer.destroyed) {
      this.initialize(this.currentUser);
    }

    this.localStream = stream;
    console.log('[Telehealth] Calling remote peer:', targetPeerId);

    // 1. Establish WebRTC Media Call
    const mediaCall = this.peer.call(targetPeerId, stream, {
      metadata: {
        callerName: this.currentUser?.name,
        callerRole: this.currentUser?.role,
        callerId: this.currentUser?.id,
        timestamp: Date.now(),
        ...metadata
      }
    });

    this.currentCall = mediaCall;

    // 2. Establish WebRTC Data Channel for 0ms In-Call Chat & Captions
    try {
      const conn = this.peer.connect(targetPeerId, {
        reliable: true,
        metadata: { callerName: this.currentUser?.name }
      });
      this.dataConnection = conn;
      conn.on('open', () => {
        console.log('[Telehealth] DataChannel established to peer:', targetPeerId);
      });
      this.setupDataConnection(conn);
    } catch (e) {}

    return mediaCall;
  }

  // Answer incoming call
  answerCall(stream) {
    if (!this.currentCall) return null;
    this.localStream = stream;
    console.log('[Telehealth] Answering incoming call with local media stream');
    this.currentCall.answer(stream);
    return this.currentCall;
  }

  // Terminate current call
  endCall() {
    if (this.currentCall) {
      try { this.currentCall.close(); } catch (e) {}
      this.currentCall = null;
    }
    if (this.dataConnection) {
      try { this.dataConnection.close(); } catch (e) {}
      this.dataConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      this.localStream = null;
    }
    this.remoteStream = null;
    this.notify('call_ended', {});
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    this.listeners.forEach(cb => {
      try { cb(event, data); } catch (e) {}
    });
  }
}

export const telehealthSignaling = new TelehealthSignalingService();
export default telehealthSignaling;
