/**
 * ReMotion Real-Time Telehealth Telephony & WebRTC Signalling Service
 * 
 * Provides cross-laptop WebRTC communication for patient-therapist video consultations.
 * Implements native RTCPeerConnection with WebRTC Perfect Negotiation, STUN/TURN relays,
 * ICE candidate queueing, and dual-transport signaling (WebSocket + REST relay).
 */

import { Peer } from 'peerjs';
import { api } from './api';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: [
      'turn:eu-0.turn.peerjs.com:3478',
      'turn:us-0.turn.peerjs.com:3478'
    ],
    username: 'peerjs',
    credential: 'peerjsp'
  },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelay',
    credential: 'openrelay'
  }
];

function normalizeId(id) {
  if (!id) return '1';
  return String(id)
    .replace(/^u_patient_/, '')
    .replace(/^u_therapist_/, '')
    .replace(/^pt_/, '')
    .replace(/^th_/, '')
    .replace(/^u_/, '')
    .trim()
    .toLowerCase() || '1';
}

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
    this.currentUser = null;

    // Native RTCPeerConnection & Signaling State
    this.nativePC = null;
    this.dataChannel = null;
    this.remoteCandidateQueue = [];
    this.activeRoomId = null;
    this.pollInterval = null;
    this.lastProcessedSignalTime = 0;
    this.processedSignalIds = new Set();
    this.makingOffer = false;
    this.ignoreOffer = false;
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
    const role = user.role === 'therapist' ? 'therapist' : 'patient';
    const id = normalizeId(user.profile?.id || user.id || (role === 'therapist' ? '1' : '1'));
    return `remotion-${role}-${id}`;
  }

  getTargetPeerId(targetUserOrPatientId, targetRole) {
    const role = targetRole === 'therapist' ? 'therapist' : 'patient';
    const id = normalizeId(targetUserOrPatientId);
    return `remotion-${role}-${id}`;
  }

  // Initialize presence and signaling handlers
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
    console.log('[Telehealth:Signaling] Initializing presence for peer ID:', desiredId);

    // Register peer in persistent backend registry so remote party can look it up
    api.registerTelehealthPeer({
      role: user.role,
      userId: user.id,
      patientId: user.profile?.id || user.id,
      peerId: desiredId
    }).catch(() => {});

    try {
      this.peer = new Peer(desiredId, {
        config: {
          iceServers: this.getIceServers(),
          iceTransportPolicy: 'all'
        },
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log('[Telehealth:Signaling] WebSocket Signaling Connected. Registered Peer ID:', id);
        this.peerId = id;
        this.isInitialized = true;
        api.registerTelehealthPeer({
          role: user.role,
          userId: user.id,
          patientId: user.profile?.id || user.id,
          peerId: id
        }).catch(() => {});
        this.notify('peer_ready', { peerId: id });
      });

      this.peer.on('call', (mediaCall) => {
        console.log('[Telehealth:Signaling] Incoming Media Call received from:', mediaCall.peer, mediaCall.metadata);
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
        console.log('[Telehealth:Signaling] Incoming DataChannel from:', conn.peer);
        this.dataConnection = conn;
        this.setupDataConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('[Telehealth:Signaling] Peer warning:', err.type, err.message);
        if (err.type === 'unavailable-id') {
          console.log('[Telehealth:Signaling] Desired ID occupied; claiming with active timestamp suffix');
          const timestampedId = `${desiredId}_${Date.now().toString(36).slice(-4)}`;
          try {
            this.peer = new Peer(timestampedId, {
              config: { iceServers: this.getIceServers(), iceTransportPolicy: 'all' }
            });
            this.peer.on('open', (newId) => {
              this.peerId = newId;
              api.registerTelehealthPeer({
                role: user.role,
                userId: user.id,
                patientId: user.profile?.id || user.id,
                peerId: newId
              }).catch(() => {});
            });
          } catch (e) {}
        }
        this.notify('error', { error: err });
      });

      this.peer.on('disconnected', () => {
        console.log('[Telehealth:Signaling] Peer temporarily disconnected from WebSocket. Reconnecting...');
        if (this.peer && !this.peer.destroyed) {
          try { this.peer.reconnect(); } catch (e) {}
        }
      });
    } catch (err) {
      console.error('[Telehealth:Signaling] Failed to construct Peer instance:', err);
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
    let sent = false;
    if (this.dataConnection && this.dataConnection.open) {
      try {
        this.dataConnection.send(payload);
        sent = true;
      } catch (e) {}
    }
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
        sent = true;
      } catch (e) {}
    }
    return sent;
  }

  setIncomingCallHandler(callback) {
    this.incomingCallCallback = callback;
  }

  // Dial remote participant via PeerJS media call
  dialCall(targetPeerId, stream, metadata = {}) {
    if (!this.peer || this.peer.destroyed) {
      this.initialize(this.currentUser);
    }

    this.localStream = stream;
    const vTracks = stream?.getVideoTracks() || [];
    const aTracks = stream?.getAudioTracks() || [];
    console.log(`[Telehealth:Call] Dialing Peer: ${targetPeerId}. Video tracks: ${vTracks.length}, Audio tracks: ${aTracks.length}`);

    const mediaCall = this.peer.call(targetPeerId, stream, {
      metadata: {
        callerName: this.currentUser?.name,
        callerRole: this.currentUser?.role,
        callerId: this.currentUser?.id,
        hasVideo: vTracks.length > 0,
        hasAudio: aTracks.length > 0,
        timestamp: Date.now(),
        ...metadata
      }
    });

    this.currentCall = mediaCall;

    try {
      const conn = this.peer.connect(targetPeerId, {
        reliable: true,
        metadata: { callerName: this.currentUser?.name }
      });
      this.dataConnection = conn;
      conn.on('open', () => {
        console.log('[Telehealth:Call] DataChannel established to peer:', targetPeerId);
      });
      this.setupDataConnection(conn);
    } catch (e) {}

    return mediaCall;
  }

  // Answer incoming call
  answerCall(stream) {
    if (!this.currentCall) return null;
    this.localStream = stream;
    const vTracks = stream?.getVideoTracks() || [];
    const aTracks = stream?.getAudioTracks() || [];
    console.log(`[Telehealth:Call] Answering Call. Video tracks: ${vTracks.length}, Audio tracks: ${aTracks.length}`);
    this.currentCall.answer(stream);
    return this.currentCall;
  }

  // Setup Native WebRTC Signaling Bridge with Perfect Negotiation Pattern
  setupNativeWebRTCSession({ roomId, isCaller, localStream, onRemoteTrack, onStateChange }) {
    this.activeRoomId = roomId;
    this.remoteCandidateQueue = [];
    this.lastProcessedSignalTime = 0;
    this.processedSignalIds.clear();
    this.makingOffer = false;
    this.ignoreOffer = false;

    const isPolite = !isCaller; // Patient is polite, Therapist is impolite for deterministic glare resolution
    console.log(`[WebRTC:Native] Initializing Native RTCPeerConnection. Room: ${roomId}, isCaller: ${isCaller}, isPolite: ${isPolite}`);

    const pc = new RTCPeerConnection({
      iceServers: this.getIceServers(),
      iceTransportPolicy: 'all'
    });

    this.nativePC = pc;

    // Attach local audio and video tracks with sendrecv transceiver direction
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log(`[WebRTC:Native] Adding local ${track.kind} track (id=${track.id}, live=${track.readyState === 'live'})`);
        pc.addTrack(track, localStream);
      });
    }

    // Explicitly ensure both transceivers are set to sendrecv
    pc.getTransceivers().forEach((t) => {
      t.direction = 'sendrecv';
      console.log(`[WebRTC:Native] Transceiver ${t.mid || t.receiver.track.kind} set to sendrecv`);
    });

    // Create DataChannel if caller
    if (isCaller) {
      try {
        const dc = pc.createDataChannel('telehealth_chat', { ordered: true });
        this.dataChannel = dc;
        dc.onopen = () => console.log('[WebRTC:Native] Native DataChannel opened');
        dc.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            this.notify('data', data);
          } catch (err) {}
        };
      } catch (e) {}
    } else {
      pc.ondatachannel = (e) => {
        console.log('[WebRTC:Native] Received remote DataChannel');
        this.dataChannel = e.channel;
        e.channel.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            this.notify('data', data);
          } catch (err) {}
        };
      };
    }

    // Perfect Negotiation pattern onnegotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        if (!isCaller && !pc.remoteDescription) {
          console.log('[WebRTC:Native] Callee waiting for caller initial offer, suppressing local offer');
          return;
        }
        if (pc.signalingState !== 'stable') {
          console.log('[WebRTC:Native] Signaling state not stable (' + pc.signalingState + '), deferring negotiation');
          return;
        }
        console.log('[WebRTC:Native] onnegotiationneeded triggered');
        this.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('[WebRTC:Native] Generated local SDP Offer:', pc.localDescription.type);

        await api.sendWebRTCSignal({
          roomId,
          senderId: this.currentUser?.id || 'user',
          userName: this.currentUser?.name || '',
          role: this.currentUser?.role || '',
          type: 'offer',
          sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
        });
      } catch (err) {
        console.warn('[WebRTC:Native] Negotiation error:', err);
      } finally {
        this.makingOffer = false;
      }
    };

    // Caller explicit initial offer creation
    if (isCaller) {
      setTimeout(async () => {
        if (!this.nativePC || this.nativePC !== pc) return;
        if (pc.signalingState === 'stable' && !pc.remoteDescription && !pc.localDescription) {
          try {
            console.log('[WebRTC:Native] Caller generating initial SDP Offer...');
            this.makingOffer = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('[WebRTC:Native] Initial local SDP Offer set:', pc.localDescription.type);
            await api.sendWebRTCSignal({
              roomId,
              senderId: this.currentUser?.id || 'user',
              userName: this.currentUser?.name || '',
              role: this.currentUser?.role || '',
              type: 'offer',
              sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
            });
          } catch (e) {
            console.warn('[WebRTC:Native] Caller initial offer notice:', e);
          } finally {
            this.makingOffer = false;
          }
        }
      }, 300);
    }

    // Gather local ICE candidates and post to REST bridge
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        api.sendWebRTCSignal({
          roomId,
          senderId: this.currentUser?.id || 'user',
          userName: this.currentUser?.name || '',
          role: this.currentUser?.role || '',
          type: 'candidate',
          candidate
        }).catch(() => {});
      }
    };

    // Remote Track delivery
    pc.ontrack = (event) => {
      console.log(`[WebRTC:Native] ontrack fired! kind: ${event.track.kind}, trackId: ${event.track.id}, streams=${event.streams?.length}`);
      let stream = (event.streams && event.streams[0]) ? event.streams[0] : null;
      if (!stream) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        stream = this.remoteStream;
      } else {
        this.remoteStream = stream;
      }
      if (onRemoteTrack) onRemoteTrack(stream, event.track);
    };

    // Connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC:Native] ICE State: ${pc.iceConnectionState}`);
      if (onStateChange) onStateChange(pc.iceConnectionState, pc.connectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC:Native] Peer Connection State: ${pc.connectionState}`);
      if (onStateChange) onStateChange(pc.iceConnectionState, pc.connectionState);
    };

    // Start Signaling Polling Loop on /api/webrtc/signal (250ms for low latency)
    if (this.pollInterval) clearInterval(this.pollInterval);
    const mySenderId = this.currentUser?.id || 'user';
    let pollCount = 0;

    this.pollInterval = setInterval(async () => {
      if (!this.nativePC || this.nativePC.signalingState === 'closed') return;
      pollCount++;

      // Caller keep-alive / offer rebroadcast if no answer received after 3 seconds
      if (isCaller && pc.signalingState === 'have-local-offer' && (pollCount % 12 === 0)) {
        if (pc.localDescription) {
          api.sendWebRTCSignal({
            roomId,
            senderId: mySenderId,
            userName: this.currentUser?.name || '',
            role: this.currentUser?.role || '',
            type: 'offer',
            sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
          }).catch(() => {});
        }
      }

      try {
        const res = await api.getWebRTCSignals(roomId, mySenderId, this.lastProcessedSignalTime);
        if (!res?.signals || res.signals.length === 0) return;

        for (const sig of res.signals) {
          if (this.processedSignalIds.has(sig.id)) continue;
          this.processedSignalIds.add(sig.id);
          this.lastProcessedSignalTime = Math.max(this.lastProcessedSignalTime, sig.timestamp);

          if (sig.type === 'offer' && sig.sdp) {
            console.log('[WebRTC:Native] Processing remote SDP Offer');
            const offerCollision = this.makingOffer || pc.signalingState !== 'stable';
            this.ignoreOffer = !isPolite && offerCollision;
            if (this.ignoreOffer) {
              console.log('[WebRTC:Native] Glare collision: Impolite peer ignoring offer');
              continue;
            }

            if (offerCollision) {
              console.log('[WebRTC:Native] Glare collision: Polite peer performing rollback');
              await Promise.all([
                pc.setLocalDescription({ type: 'rollback' }),
                pc.setRemoteDescription(new RTCSessionDescription(sig.sdp))
              ]);
            } else {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
            }

            // Drain any queued ICE candidates
            while (this.remoteCandidateQueue.length > 0) {
              const c = this.remoteCandidateQueue.shift();
              try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('[WebRTC:Native] Created and set local SDP Answer:', pc.localDescription.type);

            await api.sendWebRTCSignal({
              roomId,
              senderId: mySenderId,
              userName: this.currentUser?.name || '',
              role: this.currentUser?.role || '',
              type: 'answer',
              sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
            });
          } else if (sig.type === 'answer' && sig.sdp) {
            console.log('[WebRTC:Native] Processing remote SDP Answer in state:', pc.signalingState);
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
              console.log('[WebRTC:Native] Remote Description set successfully from Answer. State now:', pc.signalingState);
              // Drain any queued ICE candidates
              while (this.remoteCandidateQueue.length > 0) {
                const c = this.remoteCandidateQueue.shift();
                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
              }
            }
          } else if (sig.type === 'candidate' && sig.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
              } catch (err) {
                if (!this.ignoreOffer) console.warn('[WebRTC:Native] Candidate error:', err);
              }
            } else {
              // Queue candidate until remote description is installed
              this.remoteCandidateQueue.push(sig.candidate);
            }
          }
        }
      } catch (pollErr) {}
    }, 250);

    return pc;
  }

  // Terminate current call
  endCall() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.nativePC) {
      try {
        this.nativePC.close();
      } catch (e) {}
      this.nativePC = null;
    }
    if (this.activeRoomId) {
      api.clearWebRTCSignals(this.activeRoomId).catch(() => {});
      this.activeRoomId = null;
    }
    if (this.currentCall) {
      try { this.currentCall.close(); } catch (e) {}
      this.currentCall = null;
    }
    if (this.dataConnection) {
      try { this.dataConnection.close(); } catch (e) {}
      this.dataConnection = null;
    }
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch (e) {}
      this.dataChannel = null;
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
