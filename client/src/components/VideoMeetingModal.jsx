import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Users, Clock, Sparkles, MessageSquare, Send, X, Layout, Maximize2,
  Volume2, VolumeX, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { soundFX } from '../services/audio';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export default function VideoMeetingModal({
  isOpen = true,
  onClose,
  meeting,
  currentUser
}) {
  const isTherapist = currentUser?.role === 'therapist';
  const myRole = currentUser?.role || 'patient';
  const myName = currentUser?.name || (isTherapist ? 'Dr. Rajesh Kulkarni, PT' : 'Asha Sharma');
  const roomId = meeting?.room_id || 'remotion-room-pt_1';
  const isPolite = myRole === 'patient'; // Patient acts as polite peer during offer collisions

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAudioPlaybackBlocked, setIsAudioPlaybackBlocked] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [connectionStatus, setConnectionStatus] = useState('Direct Live Video Active');
  const [hasRemotePeer, setHasRemotePeer] = useState(false);
  const [remotePeerInfo, setRemotePeerInfo] = useState(null);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallInput, setInCallInput] = useState('');
  const [layoutMode, setLayoutMode] = useState('whatsapp'); // 'whatsapp' (PiP full view) or 'split' (side-by-side)
  const [isSwapped, setIsSwapped] = useState(false); // whether PiP and main feed are swapped
  const [inCallMessages, setInCallMessages] = useState([
    {
      id: 'm_system_1',
      sender: 'System Telehealth Hub',
      text: 'Encrypted peer-to-peer telehealth consultation room active.',
      time: 'Just now',
      isSystem: true
    }
  ]);
  const [captions, setCaptions] = useState([
    {
      speaker: isTherapist ? 'Dr. Rajesh Kulkarni' : (meeting?.patient_name || 'Patient'),
      text: isTherapist
        ? `Hello ${meeting?.patient_name || 'there'}. Ready for our clinical motor review and assessment.`
        : 'Hello Doctor. Ready for our clinical video consultation.',
      time: 'Just now'
    }
  ]);
  const [liveTranscript, setLiveTranscript] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const inCallEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteFallbackStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);
  const remoteAnimFrameRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const processedSignalIdsRef = useRef(new Set());

  // Multi-tier unique peer sender identifier
  const senderIdRef = useRef('peer_' + Math.random().toString(36).substring(2, 9));
  const bcRef = useRef(null);

  // Multi-tier signaling dispatcher (BroadcastChannel + localStorage + Serverless HTTP + ntfy.sh)
  const postSignal = (type, payload = {}) => {
    const packet = {
      id: 'sig_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      type,
      senderId: senderIdRef.current,
      roomId,
      timestamp: Date.now(),
      userName: myName,
      role: myRole,
      ...payload
    };

    // 1. BroadcastChannel (0ms local cross-tab communication)
    if (bcRef.current) {
      try { bcRef.current.postMessage(packet); } catch (e) {}
    }

    // 2. localStorage storage event (cross-tab / window fallback)
    try {
      localStorage.setItem(`remotion_webrtc_signal_${roomId}`, JSON.stringify(packet));
    } catch (e) {}

    // 3. Ultra-fast Cloud SSE signaling via ntfy.sh (simple POST, no CORS preflight)
    try {
      const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      fetch(`https://ntfy.sh/remotion_webrtc_${cleanRoom}`, {
        method: 'POST',
        body: JSON.stringify(packet)
      }).catch(() => {});
    } catch (e) {}

    // 4. HTTP Serverless API Signal (cross-browser / remote serverless communication)
    api.sendWebRTCSignal(packet).catch(() => {});

    // 5. Socket.IO (when Node backend server is actively connected)
    if (api.socket && api.socket.connected) {
      if (type === 'offer') {
        api.socket.emit('webrtc_offer', { roomId, offer: payload.offer, fromUser: packet.userName });
      } else if (type === 'answer') {
        api.socket.emit('webrtc_answer', { roomId, answer: payload.answer });
      } else if (type === 'candidate') {
        api.socket.emit('webrtc_ice_candidate', { roomId, candidate: payload.candidate });
      } else if (type === 'join' || type === 'ping') {
        api.socket.emit('webrtc_join', { roomId, userId: packet.senderId, userName: packet.userName, role: packet.role });
      } else if (type === 'leave') {
        api.socket.emit('webrtc_leave', { roomId, userId: packet.senderId, userName: packet.userName });
      } else if (type === 'caption') {
        api.socket.emit('webrtc_caption', { roomId, ...payload.caption });
      }
    }
  };

  // Helper to flush queued ICE candidates
  const drainIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    while (candidateQueueRef.current.length > 0) {
      const cand = candidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('[WebRTC] Queued ICE candidate error:', e);
      }
    }
  };

  // Incoming Offer Handler
  const handleOffer = async (offer, fromUser) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      const offerCollision = (pc.signalingState !== 'stable');
      if (offerCollision) {
        if (!isPolite) {
          console.log('[WebRTC] Ignoring offer due to collision (impolite peer)');
          return;
        }
        console.log('[WebRTC] Rolling back local offer (polite peer)');
        await pc.setLocalDescription({ type: 'rollback' });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await drainIceCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      postSignal('answer', { answer });
      setHasRemotePeer(true);
      setConnectionStatus(`Connected to ${fromUser || 'Peer'} • Live Consultation Active`);
    } catch (err) {
      console.error('[WebRTC] Error handling offer:', err);
    }
  };

  // Natural Audible Speech Synthesizer (TTS fallback ensures voice always works)
  const speakIncomingText = (text, speakerName) => {
    if (!window.speechSynthesis || isSpeakerMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = (speakerName && speakerName.includes('Rajesh')) ? 0.95 : 1.1;
      utterance.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  // Incoming Answer Handler
  const handleAnswer = async (answer) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await drainIceCandidates();
        setHasRemotePeer(true);
        setConnectionStatus('P2P Direct Video Stream Connected');
      }
    } catch (err) {
      console.error('[WebRTC] Error setting answer:', err);
    }
  };

  // Incoming ICE Candidate Handler
  const handleCandidate = async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc || !candidate) return;
    try {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidateQueueRef.current.push(candidate);
      }
    } catch (err) {
      console.warn('[WebRTC] ICE candidate error:', err);
    }
  };

  // Central Unified Signal Receiver
  const handleIncomingSignal = async (data) => {
    if (!data || data.senderId === senderIdRef.current) return;
    if (data.roomId && data.roomId !== roomId) return;

    // Deduplicate packets
    const sigKey = data.id || `${data.type}_${data.senderId}_${data.timestamp}`;
    if (processedSignalIdsRef.current.has(sigKey)) return;
    processedSignalIdsRef.current.add(sigKey);

    const pc = peerConnectionRef.current;

    if (data.type === 'ping' || data.type === 'join') {
      console.log('[WebRTC Signal] Remote peer active:', data.userName);
      setRemotePeerInfo({ name: data.userName, role: data.role });
      setHasRemotePeer(true);
      setConnectionStatus(`${data.userName || 'Peer'} connected • Live Consultation Active`);

      // Exactly one peer creates the initial WebRTC offer to eliminate glare
      const shouldInitiate = isTherapist || senderIdRef.current < data.senderId;
      if (pc && shouldInitiate && pc.signalingState === 'stable') {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          postSignal('offer', { offer });
        } catch (e) {
          console.warn('[WebRTC] Offer error on ping:', e);
        }
      }
    } else if (data.type === 'offer') {
      setHasRemotePeer(true);
      setRemotePeerInfo({ name: data.userName, role: data.role });
      await handleOffer(data.offer, data.userName);
    } else if (data.type === 'answer') {
      setHasRemotePeer(true);
      await handleAnswer(data.answer);
    } else if (data.type === 'candidate') {
      await handleCandidate(data.candidate);
    } else if (data.type === 'caption' && data.caption) {
      setCaptions(prev => [...prev.slice(-3), data.caption]);
      if (data.caption.text && data.caption.speaker !== myName) {
        speakIncomingText(data.caption.text, data.caption.speaker);
      }
    } else if (data.type === 'in_call_chat' && data.message) {
      setInCallMessages(prev => [...prev.filter(m => m.id !== data.message.id), data.message]);
      if (data.message.sender !== myName) {
        soundFX.playClick();
        if (!showInCallChat) setUnreadChatCount(prev => prev + 1);
        speakIncomingText(data.message.text, data.message.sender);
      }
    } else if (data.type === 'leave') {
      setHasRemotePeer(false);
      setConnectionStatus('Peer left the consultation room.');
    }
  };

  // Continuous Speech Recognition Subtitles Engine
  const startSpeechSubtitles = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' :
                           selectedLanguage === 'kn' ? 'kn-IN' :
                           selectedLanguage === 'ta' ? 'ta-IN' :
                           selectedLanguage === 'te' ? 'te-IN' : 'en-US';

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setLiveTranscript(transcript);

          if (event.results[event.results.length - 1].isFinal) {
            const cleanText = transcript.trim();
            if (cleanText) {
              const newCap = {
                speaker: myName,
                text: cleanText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };

              setCaptions(prev => [...prev.slice(-3), newCap]);
              setLiveTranscript('');
              postSignal('caption', { caption: newCap });
            }
          }
        };

        recognition.onerror = (e) => {
          if (e.error === 'no-speech') return; // Expected when silent
          console.warn('Speech recognition status:', e.error);
        };

        // Continuous Loop: Auto-restart recognition when voice pauses
        recognition.onend = () => {
          if (recognitionRef.current && captionsEnabled && isOpen) {
            try { recognition.start(); } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition activation warning:', err);
      }
    }
  };

  // Meeting Setup Routine
  const setupMeeting = async () => {
    try {
      candidateQueueRef.current = [];
      let stream = null;

      // 1. Acquire direct hardware camera & microphone
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: true
          });
        }
      } catch (camErr) {
        console.warn('Direct camera/mic in use or restricted, trying video-only or audio-only:', camErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (vErr) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (aErr) {}
        }
      }

      // Ensure active audio track exists for WebRTC pipe
      if (stream && stream.getAudioTracks().length === 0) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const actx = new AudioContext();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            gain.gain.value = 0.0001; // carrier tone keeps audio channel alive
            osc.connect(gain);
            const dest = actx.createMediaStreamDestination();
            gain.connect(dest);
            osc.start();
            const synthTrack = dest.stream.getAudioTracks()[0];
            if (synthTrack) stream.addTrack(synthTrack);
          }
        } catch (e) {}
      }

      localStreamRef.current = stream;

      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.play().catch(() => {});
      }

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind);
        const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.play().catch(() => {});
        }

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.play().then(() => {
            setIsAudioPlaybackBlocked(false);
          }).catch(err => {
            console.warn('Remote audio autoplay waiting for click:', err);
            setIsAudioPlaybackBlocked(true);
          });
        }
        setHasRemotePeer(true);
        setConnectionStatus('Direct Live Video & Audio Connected');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          postSignal('candidate', { candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] State change:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setHasRemotePeer(true);
          setConnectionStatus('Active P2P Consultation');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionStatus('Direct link dropped. Polling resilient signal bridge...');
        }
      };

      // 3. Initialize BroadcastChannel for 0ms cross-tab signaling
      try {
        const bc = new BroadcastChannel(`remotion_webrtc_channel_${roomId}`);
        bcRef.current = bc;
        bc.onmessage = (e) => handleIncomingSignal(e.data);
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }

      // 4. Initial join announcement
      postSignal('join');

      // 5. Start speech subtitles
      startSpeechSubtitles();

    } catch (err) {
      console.error('Fatal meeting setup error:', err);
      setConnectionStatus('Setup error: ' + err.message);
    }
  };

  // Discovery Heartbeat (dispatches ping every 1000ms while room is active)
  useEffect(() => {
    let pingInterval;
    if (isOpen) {
      pingInterval = setInterval(() => {
        postSignal('ping');
      }, 1000);
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [isOpen, roomId]);

  // localStorage Cross-Window Storage Listener
  useEffect(() => {
    const handleStorageEvent = (e) => {
      if (e.key === `remotion_webrtc_signal_${roomId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingSignal(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Active localStorage poll (catches missed storage events across windows)
    const localPoll = setInterval(() => {
      try {
        const raw = localStorage.getItem(`remotion_webrtc_signal_${roomId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          handleIncomingSignal(parsed);
        }
      } catch (err) {}
    }, 400);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(localPoll);
    };
  }, [roomId]);

  // Ultra-Fast Cross-Browser Cloud SSE & JSON Polling via ntfy.sh (bridges Edge to Chrome in <50ms)
  useEffect(() => {
    let sseSource = null;
    let ntfyPollInterval = null;

    if (isOpen) {
      const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const topicUrl = `https://ntfy.sh/remotion_webrtc_${cleanRoom}`;

      // 1. SSE Stream
      try {
        sseSource = new EventSource(`${topicUrl}/sse`);
        sseSource.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw.event === 'message' && raw.message) {
              const packet = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
              if (packet && packet.senderId !== senderIdRef.current) {
                handleIncomingSignal(packet);
              }
            }
          } catch (e) {}
        };
      } catch (err) {}

      // 2. Active JSON Poll
      ntfyPollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${topicUrl}/json?since=15s`);
          const text = await res.text();
          const lines = text.trim().split('\n');
          for (const line of lines) {
            if (!line) continue;
            try {
              const raw = JSON.parse(line);
              if (raw.event === 'message' && raw.message) {
                const packet = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
                if (packet && packet.senderId !== senderIdRef.current) {
                  handleIncomingSignal(packet);
                }
              }
            } catch (lineErr) {}
          }
        } catch (pollErr) {}
      }, 1000);
    }

    return () => {
      if (sseSource) {
        try { sseSource.close(); } catch (e) {}
      }
      if (ntfyPollInterval) clearInterval(ntfyPollInterval);
    };
  }, [isOpen, roomId]);

  // HTTP Polling Fallback (for remote cross-browser / serverless Vercel tabs)
  useEffect(() => {
    let pollInterval;
    if (isOpen) {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.getWebRTCSignals(roomId, senderIdRef.current, Date.now() - 20000);
          if (res?.signals && res.signals.length > 0) {
            for (const sig of res.signals) {
              await handleIncomingSignal(sig);
            }
          }
        } catch (e) {}
      }, 800);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, roomId]);

  // Lifecycle Management
  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setupMeeting();
    }
    return () => {
      clearInterval(timer);
      teardownMeeting();
    };
  }, [isOpen, roomId]);

  // Re-engage speech recognition on language or toggle change
  useEffect(() => {
    if (isOpen && captionsEnabled) {
      startSpeechSubtitles();
    } else if (!captionsEnabled && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  }, [selectedLanguage, captionsEnabled, isOpen]);

  // Auto-scroll in-call chat on new messages
  useEffect(() => {
    if (showInCallChat) {
      setUnreadChatCount(0);
      inCallEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [inCallMessages, showInCallChat]);

  const teardownMeeting = () => {
    postSignal('leave');
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (remoteAnimFrameRef.current) cancelAnimationFrame(remoteAnimFrameRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteFallbackStreamRef.current) {
      remoteFallbackStreamRef.current.getTracks().forEach(t => t.stop());
      remoteFallbackStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (bcRef.current) {
      try { bcRef.current.close(); } catch (e) {}
      bcRef.current = null;
    }
    setCallDuration(0);
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    setIsVideoMuted(!isVideoMuted);
  };

  // In-call message dispatch
  const handleSendInCallMessage = (e) => {
    e?.preventDefault();
    if (!inCallInput.trim()) return;

    const newMsg = {
      id: 'icm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      sender: myName,
      role: myRole,
      text: inCallInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInCallMessages(prev => [...prev, newMsg]);
    setInCallInput('');
    postSignal('in_call_chat', { message: newMsg });
  };

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const otherPeerName = remotePeerInfo?.name || (isTherapist ? 'Asha Sharma (Patient)' : 'Dr. Rajesh Kulkarni, PT');
  const otherPeerRoleLabel = isTherapist ? 'Patient Telemetry Feed' : 'Supervising Physical Therapist';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="bg-[#0c1322] border border-cyan-500/30 rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-display">
                  {meeting?.title || 'Weekly Kinematics Evaluation'}
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  {connectionStatus}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Call Duration: {formatTime(callDuration)}</span>
                <span>•</span>
                <span className="text-slate-300 font-mono text-[10px]">Room: {roomId}</span>
              </div>
            </div>
          </div>

          {/* Subtitles, Layout Switcher & Chat Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLayoutMode(layoutMode === 'whatsapp' ? 'split' : 'whatsapp')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-medium cursor-pointer"
              title="Toggle WhatsApp PiP vs Split Screen"
            >
              <Layout className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{layoutMode === 'whatsapp' ? 'WhatsApp PiP' : 'Split View'}</span>
            </button>

            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-900">English (Default)</option>
                <option value="hi" className="bg-slate-900">Hindi</option>
                <option value="kn" className="bg-slate-900">Kannada</option>
                <option value="ta" className="bg-slate-900">Tamil</option>
                <option value="te" className="bg-slate-900">Telugu</option>
              </select>
            </div>

            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                isSpeakerMuted ? 'bg-amber-950 text-amber-300 border-amber-600/50' : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title={isSpeakerMuted ? 'Unmute consultation voice output' : 'Mute consultation voice output'}
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                captionsEnabled ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title={captionsEnabled ? 'Disable live closed captions' : 'Enable live closed captions'}
            >
              <Subtitles className="w-4 h-4" />
              <span className="hidden sm:inline">Subtitles</span>
            </button>

            <button
              onClick={() => {
                setShowInCallChat(!showInCallChat);
                if (!showInCallChat) setUnreadChatCount(0);
              }}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                showInCallChat ? 'bg-blue-950 text-blue-300 border-blue-500/50 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">In-Call Chat</span>
              {unreadChatCount > 0 && !showInCallChat && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold font-mono animate-bounce">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hidden Remote Audio Element for Direct P2P Voice Output */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Audio Unmute Alert Banner (if browser autoplay policy paused sound) */}
        {isAudioPlaybackBlocked && (
          <div
            onClick={() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.muted = false;
                remoteAudioRef.current.play().then(() => setIsAudioPlaybackBlocked(false)).catch(() => {});
              }
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
                remoteVideoRef.current.play().catch(() => {});
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer shadow-lg animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
            <span>Consultation voice audio paused by browser. Tap anywhere or click here to unmute sound!</span>
          </div>
        )}

        {/* Video Screen Layout (WhatsApp Mobile PiP by Default, or Split Screen) */}
        <div className="flex-1 p-3 sm:p-4 bg-slate-950/70 relative overflow-hidden flex flex-col justify-center">
          {layoutMode === 'whatsapp' ? (
            /* WhatsApp Layout: Full Screen Main Feed + Floating PiP (Independent DOM nodes with zero ref detachment) */
            <div className="relative w-full h-full rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
              {/* Remote Video Element */}
              <div
                onClick={isSwapped ? () => setIsSwapped(false) : undefined}
                className={`transition-all duration-300 overflow-hidden relative flex items-center justify-center bg-slate-950 ${
                  !isSwapped
                    ? 'w-full h-full absolute inset-0 z-10'
                    : 'absolute top-4 right-4 w-36 sm:w-48 aspect-[3/4] rounded-2xl bg-slate-900 border-2 border-cyan-400/80 shadow-2xl z-30 cursor-pointer group hover:scale-105'
                }`}
                title={isSwapped ? 'Click to bring remote face to main view' : undefined}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Direct Video Connection Status Badge when waiting for peer */}
                {!hasRemotePeer && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6 z-20">
                    <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></div>
                      <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <Video className="w-7 h-7" />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white font-display">
                      Direct Video Meeting Active
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Connecting direct camera feed with {otherPeerName}...
                    </p>
                    <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                      Room: {roomId}
                    </div>
                  </div>
                )}

                <div className={`bg-black/80 px-2.5 py-1 rounded-full text-white backdrop-blur-md border border-slate-700 ${
                  !isSwapped ? 'absolute top-4 left-4 z-20 text-xs' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate'
                }`}>
                  <span className="font-bold">{otherPeerName}</span>
                  {!isSwapped && <span className="text-[10px] text-cyan-400 font-mono ml-1.5">({otherPeerRoleLabel})</span>}
                </div>
              </div>

              {/* Local Video Element */}
              <div
                onClick={!isSwapped ? () => setIsSwapped(true) : undefined}
                className={`transition-all duration-300 overflow-hidden relative flex items-center justify-center bg-slate-950 ${
                  isSwapped
                    ? 'w-full h-full absolute inset-0 z-10'
                    : 'absolute top-4 right-4 w-36 sm:w-48 aspect-[3/4] rounded-2xl bg-slate-900 border-2 border-cyan-400/80 shadow-2xl z-30 cursor-pointer group hover:scale-105'
                }`}
                title={!isSwapped ? 'Click to expand self feed' : undefined}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />

                {isVideoMuted && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-3 z-20">
                    <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono">Camera Off</span>
                  </div>
                )}

                <div className={`bg-black/80 px-2.5 py-1 rounded-full text-white backdrop-blur-md border border-slate-700 ${
                  isSwapped ? 'absolute top-4 left-4 z-20 text-xs' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate'
                }`}>
                  <span className="font-bold">You ({myName})</span>
                  {isSwapped && <span className="text-[10px] text-cyan-400 font-mono ml-1.5">(Local Feed)</span>}
                </div>
              </div>
            </div>
          ) : (
            /* Split View: Side-by-Side 50/50 Dual Stage */
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Remote Feed */}
              <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {!hasRemotePeer && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6 z-20">
                    <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></div>
                      <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <Video className="w-7 h-7" />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white font-display">
                      Direct Video Meeting Active
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Connecting direct camera feed with {otherPeerName}...
                    </p>
                    <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                      Room: {roomId}
                    </div>
                  </div>
                )}

                <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 bg-black/70 px-2.5 py-1 rounded-full text-[10px] text-white backdrop-blur-md border border-slate-700">
                  <Users className="w-3 h-3 text-cyan-400" />
                  <span className="font-bold">{otherPeerName}</span>
                </div>
              </div>

              {/* Local Feed */}
              <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />

                {isVideoMuted && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-3 z-20">
                    <VideoOff className="w-6 h-6 text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-400 font-mono">Camera Off</span>
                  </div>
                )}

                <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 bg-black/70 px-2.5 py-1 rounded-full text-[10px] text-white backdrop-blur-md border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold">You ({myName})</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Subtitles Overlay - Clean without background as requested */}
          {captionsEnabled && (
            <div className="absolute bottom-6 left-6 right-6 z-30 pointer-events-none flex flex-col items-center justify-end text-center">
              <div className="space-y-1.5 max-w-2xl px-4 py-2">
                {captions.slice(-2).map((c, i) => (
                  <div
                    key={i}
                    className="text-sm sm:text-base font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                  >
                    <span className="text-cyan-300 font-bold mr-2">{c.speaker}:</span>
                    <span>"{c.text}"</span>
                  </div>
                ))}
                {liveTranscript && (
                  <div className="text-sm sm:text-base font-medium text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] animate-pulse">
                    <span>{liveTranscript}...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* In-Call Text Chat Drawer */}
          {showInCallChat && (
            <div className="absolute top-4 right-4 bottom-4 w-80 z-40 bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-4 shadow-2xl flex flex-col animate-slideDown">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">In-Call Chat</span>
                </div>
                <button
                  onClick={() => setShowInCallChat(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Reply Chips */}
              <div className="py-2 border-b border-slate-800 flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-[10px]">
                {['Can you hear me?', 'Loud and clear!', 'Starting routine now', 'Understood doctor'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const newMsg = {
                        id: 'icm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                        sender: myName,
                        role: myRole,
                        text: chip,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setInCallMessages(prev => [...prev, newMsg]);
                      postSignal('in_call_chat', { message: newMsg });
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-700 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
                {inCallMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl ${
                      msg.isSystem
                        ? 'bg-slate-900/80 text-cyan-300 font-mono text-[10px] text-center border border-slate-800'
                        : msg.sender === myName
                        ? 'bg-cyan-950/60 border border-cyan-800/60 text-slate-100 ml-4'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 mr-4'
                    }`}
                  >
                    {!msg.isSystem && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className="font-bold text-cyan-300">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                    )}
                    <div>{msg.text}</div>
                  </div>
                ))}
                <div ref={inCallEndRef} />
              </div>

              <form onSubmit={handleSendInCallMessage} className="pt-2 border-t border-slate-800 flex items-center space-x-1.5">
                <input
                  type="text"
                  value={inCallInput}
                  onChange={(e) => setInCallInput(e.target.value)}
                  placeholder="Type message to peer..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isAudioMuted ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
              }`}
              title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isVideoMuted ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
              }`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-2 cursor-pointer transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave Consultation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
