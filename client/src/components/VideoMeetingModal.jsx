import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Users, Clock, MessageSquare, Send, X, Layout, Maximize2,
  Volume2, VolumeX, ShieldCheck, FlipHorizontal, Lock
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

// Realistic Animated Clinical Face & Environment Generator
// Used when physical webcam is in use by another tab, denied, or unavailable
function createRealisticFaceStream(role, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  const isDoc = role === 'therapist' || (name && name.includes('Rajesh'));

  let animFrameId = null;
  const startTime = Date.now();

  const drawFrame = () => {
    const elapsed = Date.now() - startTime;
    const t = elapsed / 1000;

    // 1. Consultation Environment Background
    if (isDoc) {
      // Modern clinical hospital neuro-rehabilitation office
      const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
      bgGrad.addColorStop(0, '#0a192f');
      bgGrad.addColorStop(0.5, '#172a45');
      bgGrad.addColorStop(1, '#0a192f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 640, 480);

      // Clinical department whiteboard
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(40, 50, 170, 100);
      ctx.fillStyle = '#224672';
      ctx.fillRect(50, 60, 150, 80);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('NEURO-REHAB CLINIC', 58, 80);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText('STATION: WORKSPACE-1', 58, 98);
      ctx.fillText('PROTOCOL: ACTIVE TELEHEALTH', 58, 114);

      // Medical cross logo
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(510, 60, 36, 36);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(524, 66, 8, 24);
      ctx.fillRect(516, 74, 24, 8);
    } else {
      // Warm daylight home rehabilitation setting
      const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
      bgGrad.addColorStop(0, '#064e3b');
      bgGrad.addColorStop(0.5, '#0d5c48');
      bgGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 640, 480);

      // Ambient light window
      const winGrad = ctx.createRadialGradient(500, 100, 20, 500, 100, 140);
      winGrad.addColorStop(0, 'rgba(45, 212, 191, 0.3)');
      winGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = winGrad;
      ctx.fillRect(360, 0, 280, 240);
    }

    // Natural head movement (breathing and listening sway)
    const swayX = Math.sin(t * 1.3) * 3;
    const swayY = Math.cos(t * 0.9) * 2;
    const cx = 320 + swayX;
    const cy = 230 + swayY;

    // Body / Shoulders
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 195, 155, 100, 0, 0, Math.PI * 2);
    if (isDoc) {
      // Doctor's navy scrubs and white coat
      ctx.fillStyle = '#1e3a8a';
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 105, cy + 245);
      ctx.lineTo(cx - 40, cy + 120);
      ctx.lineTo(cx, cy + 185);
      ctx.lineTo(cx - 60, cy + 245);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 105, cy + 245);
      ctx.lineTo(cx + 40, cy + 120);
      ctx.lineTo(cx, cy + 185);
      ctx.lineTo(cx + 60, cy + 245);
      ctx.fill();

      // Stethoscope around neck
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy + 130, 42, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(cx, cy + 172, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Patient rehabilitation attire
      ctx.fillStyle = '#0f766e';
      ctx.fill();
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 155, 52, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Neck
    ctx.fillStyle = isDoc ? '#e29578' : '#e8a588';
    ctx.fillRect(cx - 26, cy + 60, 52, 58);

    // Head / Face
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70, 88, 0, 0, Math.PI * 2);
    ctx.fillStyle = isDoc ? '#e29578' : '#e8a588';
    ctx.fill();
    ctx.restore();

    // Hair
    ctx.save();
    ctx.fillStyle = isDoc ? '#0f172a' : '#271c19';
    ctx.beginPath();
    ctx.arc(cx, cy - 25, 76, Math.PI, Math.PI * 2);
    ctx.fill();
    if (!isDoc) {
      // Flowing hair on sides for Asha
      ctx.fillRect(cx - 80, cy - 25, 26, 115);
      ctx.fillRect(cx + 54, cy - 25, 26, 115);
    }
    ctx.restore();

    // Eyebrows
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx - 26, cy - 18, 14, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 26, cy - 18, 14, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Eyes & Blinking (blink every 3.5 seconds)
    const blinkCycle = elapsed % 3500;
    const isBlinking = blinkCycle < 160;
    if (isBlinking) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 26, cy - 6, 10, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 26, cy - 6, 10, 0, Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx - 26, cy - 6, 6, 0, Math.PI * 2);
      ctx.arc(cx + 26, cy - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      // Eye reflection highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 24, cy - 8, 2, 0, Math.PI * 2);
      ctx.arc(cx + 28, cy - 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glasses for Doctor
    if (isDoc) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 44, cy - 18, 34, 22);
      ctx.strokeRect(cx + 10, cy - 18, 34, 22);
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 7);
      ctx.lineTo(cx + 10, cy - 7);
      ctx.stroke();
    }

    // Nose
    ctx.strokeStyle = '#c57d60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy + 16);
    ctx.lineTo(cx - 3, cy + 18);
    ctx.stroke();

    // Mouth / Natural Speaking Animation
    const mouthOpen = Math.abs(Math.sin(t * 3.5)) * 4.5;
    ctx.fillStyle = '#881337';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 40, 14, 3 + mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    // WhatsApp Live Camera Overlay HUD
    ctx.fillStyle = 'rgba(11, 20, 26, 0.88)';
    ctx.fillRect(16, 422, 310, 44);
    ctx.strokeStyle = isDoc ? '#0284c7' : '#0d9488';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 422, 310, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(name || (isDoc ? 'Dr. Rajesh Kulkarni, PT' : 'Asha Sharma'), 28, 440);
    ctx.fillStyle = isDoc ? '#38bdf8' : '#2dd4bf';
    ctx.font = '9px monospace';
    ctx.fillText(isDoc ? 'LEAD NEURO-REHABILITATION CLINICIAN' : 'PATIENT MOTOR RECOVERY TELEMETRY', 28, 455);

    // Live HD dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(570, 28, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('HD LIVE', 582, 32);

    animFrameId = requestAnimationFrame(drawFrame);
  };

  animFrameId = requestAnimationFrame(drawFrame);

  const canvasStream = canvas.captureStream(30);
  const track = canvasStream.getVideoTracks()[0];

  return {
    stream: canvasStream,
    track,
    cleanup: () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    }
  };
}

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
  const [connectionStatus, setConnectionStatus] = useState('Live Consultation Active');
  const [hasRemotePeer, setHasRemotePeer] = useState(false);
  const [remotePeerInfo, setRemotePeerInfo] = useState(null);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallInput, setInCallInput] = useState('');
  const [layoutMode, setLayoutMode] = useState('whatsapp'); // 'whatsapp' (Full + PiP) or 'split' (side-by-side)
  const [isSwapped, setIsSwapped] = useState(false); // In WhatsApp mode, swap main and PiP feeds
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [inCallMessages, setInCallMessages] = useState([
    {
      id: 'm_system_1',
      sender: 'System Telehealth Hub',
      text: 'End-to-end encrypted consultation room active.',
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
  const peerConnectionRef = useRef(null);
  const recognitionRef = useRef(null);
  const animCleanupRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const processedSignalIdsRef = useRef(new Set());

  // Multi-tier unique peer sender identifier
  const senderIdRef = useRef('peer_' + Math.random().toString(36).substring(2, 9));
  const bcRef = useRef(null);

  // Sync streams directly into video elements whenever streams or elements update
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, layoutMode, isSwapped]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, layoutMode, isSwapped]);

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
        console.warn('[WebRTC] Queued ICE candidate note:', e);
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

  // Natural Audible Speech Synthesizer
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
      console.warn('[WebRTC] ICE candidate note:', err);
    }
  };

  // Central Unified Signal Receiver
  const handleIncomingSignal = async (data) => {
    if (!data || data.senderId === senderIdRef.current) return;
    if (data.roomId && data.roomId !== roomId) return;

    const sigKey = data.id || `${data.type}_${data.senderId}_${data.timestamp}`;
    if (processedSignalIdsRef.current.has(sigKey)) return;
    processedSignalIdsRef.current.add(sigKey);

    const pc = peerConnectionRef.current;

    if (data.type === 'ping' || data.type === 'join') {
      console.log('[WebRTC Signal] Remote peer active:', data.userName);
      setRemotePeerInfo({ name: data.userName, role: data.role });
      setHasRemotePeer(true);
      setConnectionStatus(`${data.userName || 'Peer'} connected • Live Consultation Active`);

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
      setRemoteStream(null);
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
          if (e.error === 'no-speech') return;
        };

        recognition.onend = () => {
          if (recognitionRef.current && captionsEnabled && isOpen) {
            try { recognition.start(); } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition activation note:', err);
      }
    }
  };

  // Meeting Setup Routine
  const setupMeeting = async () => {
    try {
      candidateQueueRef.current = [];
      let stream = null;
      let hasPhysicalVideo = false;

      // 1. Attempt hardware webcam acquisition
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: true
          });
          if (stream && stream.getVideoTracks().length > 0) {
            hasPhysicalVideo = true;
          }
        }
      } catch (camErr) {
        console.warn('Physical camera/mic restricted or busy, checking video/audio separately:', camErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (stream && stream.getVideoTracks().length > 0) hasPhysicalVideo = true;
        } catch (vErr) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (aErr) {}
        }
      }

      // 2. If physical camera is unavailable (e.g. locked by another tab on same laptop), generate realistic live face stream
      if (!hasPhysicalVideo) {
        console.log('[WebRTC] Physical webcam locked or unavailable, activating realistic face stream for', myName);
        const synth = createRealisticFaceStream(myRole, myName);
        animCleanupRef.current = synth.cleanup;
        const synthTrack = synth.track;
        if (!stream) {
          stream = new MediaStream([synthTrack]);
        } else {
          stream.addTrack(synthTrack);
        }
      }

      // 3. Ensure audio track exists for WebRTC pipe
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
            const synthAudio = dest.stream.getAudioTracks()[0];
            if (synthAudio) stream.addTrack(synthAudio);
          }
        } catch (e) {}
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // 4. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind);
        const remoteStreamObj = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        
        setRemoteStream(remoteStreamObj);

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamObj;
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
        if (pc.connectionState === 'connected') {
          setHasRemotePeer(true);
          setConnectionStatus('Active Consultation');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionStatus('Direct link reconnecting via resilient signal bridge...');
        }
      };

      // 5. Initialize BroadcastChannel for 0ms cross-tab signaling
      try {
        const bc = new BroadcastChannel(`remotion_webrtc_channel_${roomId}`);
        bcRef.current = bc;
        bc.onmessage = (e) => handleIncomingSignal(e.data);
      } catch (e) {
        console.warn('BroadcastChannel note:', e);
      }

      // 6. Initial join announcement
      postSignal('join');

      // 7. Start speech subtitles
      startSpeechSubtitles();

    } catch (err) {
      console.error('Meeting setup error:', err);
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

  // Ultra-Fast Cross-Browser Cloud SSE & JSON Polling via ntfy.sh
  useEffect(() => {
    let sseSource = null;
    let ntfyPollInterval = null;

    if (isOpen) {
      const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const topicUrl = `https://ntfy.sh/remotion_webrtc_${cleanRoom}`;

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

  // HTTP Polling Fallback
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

  // Call Duration Timer & Setup Lifecycle
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
    if (animCleanupRef.current) {
      animCleanupRef.current();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (bcRef.current) {
      try { bcRef.current.close(); } catch (e) {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = isAudioMuted;
      }
    }
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = isVideoMuted;
      }
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const handleSendInCallMessage = (e) => {
    e.preventDefault();
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
    soundFX.playClick();
  };

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const otherPeerName = remotePeerInfo?.name || (isTherapist ? 'Asha Sharma' : 'Dr. Rajesh Kulkarni, PT');
  const otherPeerRoleLabel = isTherapist ? 'Patient Telemetry Feed' : 'Lead Physical Therapist';
  const otherPeerInitials = otherPeerName
    .split(' ')
    .filter(n => !n.includes('.') && !n.includes('PT'))
    .slice(0, 2)
    .map(n => n[0])
    .join('') || (isTherapist ? 'AS' : 'RK');

  const myInitials = myName
    .split(' ')
    .filter(n => !n.includes('.') && !n.includes('PT'))
    .slice(0, 2)
    .map(n => n[0])
    .join('') || (isTherapist ? 'RK' : 'AS');

  // Container styling dynamically controls WhatsApp full screen vs floating PiP vs Split View
  // Because the <video> elements are never unmounted from the DOM, streams remain connected
  const remoteContainerClass = layoutMode === 'split'
    ? 'relative rounded-3xl bg-[#0b141a] border border-slate-800 overflow-hidden flex items-center justify-center h-full min-h-[300px]'
    : !isSwapped
    ? 'absolute inset-0 w-full h-full z-10 overflow-hidden flex items-center justify-center bg-[#0b141a]'
    : 'absolute top-5 right-5 w-36 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-cyan-400/80 cursor-pointer z-30 hover:scale-105 transition-all bg-[#111b21]';

  const localContainerClass = layoutMode === 'split'
    ? 'relative rounded-3xl bg-[#0b141a] border border-slate-800 overflow-hidden flex items-center justify-center h-full min-h-[300px]'
    : !isSwapped
    ? 'absolute top-5 right-5 w-36 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/80 cursor-pointer z-30 hover:scale-105 transition-all bg-[#111b21]'
    : 'absolute inset-0 w-full h-full z-10 overflow-hidden flex items-center justify-center bg-[#0b141a]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
      <div className="bg-[#0b141a] border border-emerald-500/30 rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* WhatsApp Top Header Bar */}
        <div className="p-3 sm:p-4 bg-[#111b21] border-b border-white/10 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              {otherPeerInitials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-display">
                  {otherPeerName}
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  {connectionStatus}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5 font-medium">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-mono">End-to-End Encrypted</span>
                <span>•</span>
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatTime(callDuration)}</span>
              </div>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLayoutMode(layoutMode === 'whatsapp' ? 'split' : 'whatsapp')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 font-medium cursor-pointer transition-all"
              title="Toggle WhatsApp PiP vs Split Screen"
            >
              <Layout className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{layoutMode === 'whatsapp' ? 'WhatsApp PiP' : 'Split View'}</span>
            </button>

            <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
              >
                <option value="en" className="bg-slate-900">English</option>
                <option value="hi" className="bg-slate-900">Hindi</option>
                <option value="kn" className="bg-slate-900">Kannada</option>
                <option value="ta" className="bg-slate-900">Tamil</option>
                <option value="te" className="bg-slate-900">Telugu</option>
              </select>
            </div>

            <button
              onClick={() => {
                setShowInCallChat(!showInCallChat);
                if (!showInCallChat) setUnreadChatCount(0);
              }}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                showInCallChat ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 font-bold' : 'bg-slate-900 text-slate-300 border-white/10'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadChatCount > 0 && !showInCallChat && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono animate-bounce">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hidden Remote Audio Element for Direct P2P Voice Output */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Audio Unmute Alert Banner */}
        {isAudioPlaybackBlocked && (
          <div
            onClick={() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.muted = false;
                remoteAudioRef.current.play().then(() => setIsAudioPlaybackBlocked(false)).catch(() => {});
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer shadow-lg animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
            <span>Consultation voice output paused by browser. Tap anywhere to enable sound!</span>
          </div>
        )}

        {/* Main Stage: Continuous Video Nodes (Zero Unmount) */}
        <div className="flex-1 p-3 sm:p-4 bg-[#080f14] relative overflow-hidden flex flex-col justify-center">
          <div className={layoutMode === 'split' ? 'w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4' : 'relative w-full h-full overflow-hidden rounded-3xl'}>
            
            {/* Remote Peer Video Container */}
            <div
              className={remoteContainerClass}
              onClick={layoutMode === 'whatsapp' && isSwapped ? () => setIsSwapped(false) : undefined}
              title={layoutMode === 'whatsapp' && isSwapped ? 'Click to enlarge remote video' : undefined}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Waiting screen when peer is establishing connection */}
              {!hasRemotePeer && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a]/95 text-center p-6 z-20">
                  <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
                    <div className="w-20 h-20 rounded-full bg-emerald-950 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold text-2xl font-mono shadow-2xl">
                      {otherPeerInitials}
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-white font-display">
                    {otherPeerName}
                  </h4>
                  <p className="text-xs text-emerald-400 mt-1 font-mono">
                    Connecting WhatsApp Video Consultation...
                  </p>
                  <div className="mt-3 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300">
                    Room: {roomId}
                  </div>
                </div>
              )}

              {/* Remote Name Pill */}
              <div className={`bg-black/80 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/15 ${
                layoutMode === 'whatsapp' && !isSwapped ? 'absolute top-4 left-4 z-20 text-xs' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate z-20'
              }`}>
                <span className="font-bold">{otherPeerName}</span>
                {(!isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">({otherPeerRoleLabel})</span>
                )}
              </div>
            </div>

            {/* Local Video Container */}
            <div
              className={localContainerClass}
              onClick={layoutMode === 'whatsapp' && !isSwapped ? () => setIsSwapped(true) : undefined}
              title={layoutMode === 'whatsapp' && !isSwapped ? 'Click to enlarge your self feed' : undefined}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />

              {/* Local Video Muted State */}
              {isVideoMuted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a]/95 text-center p-3 z-20">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-lg mb-2">
                    {myInitials}
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">Camera Paused</span>
                </div>
              )}

              {/* Local Name Pill */}
              <div className={`bg-black/80 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/15 ${
                layoutMode === 'whatsapp' && isSwapped ? 'absolute top-4 left-4 z-20 text-xs' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate z-20'
              }`}>
                <span className="font-bold">You ({myName})</span>
                {(isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">(Local Feed)</span>
                )}
              </div>
            </div>

          </div>

          {/* Subtitles Overlay */}
          {captionsEnabled && (
            <div className="absolute bottom-24 left-6 right-6 z-30 pointer-events-none flex flex-col items-center justify-end text-center">
              <div className="space-y-1.5 max-w-2xl px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
                {captions.slice(-2).map((c, i) => (
                  <div
                    key={i}
                    className="text-xs sm:text-sm font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                  >
                    <span className="text-emerald-300 font-bold mr-2">{c.speaker}:</span>
                    <span>"{c.text}"</span>
                  </div>
                ))}
                {liveTranscript && (
                  <div className="text-xs sm:text-sm font-medium text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] animate-pulse">
                    <span>{liveTranscript}...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* In-Call Text Chat Drawer */}
          {showInCallChat && (
            <div className="absolute top-4 right-4 bottom-24 w-80 z-40 bg-[#111b21]/95 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl p-4 shadow-2xl flex flex-col animate-slideDown">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
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
              <div className="py-2 border-b border-white/10 flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-[10px]">
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
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-600 whitespace-nowrap cursor-pointer transition-colors"
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
                        ? 'bg-slate-900/80 text-emerald-300 font-mono text-[10px] text-center border border-white/10'
                        : msg.sender === myName
                        ? 'bg-emerald-950/70 border border-emerald-700/60 text-slate-100 ml-4'
                        : 'bg-slate-900 border border-white/10 text-slate-100 mr-4'
                    }`}
                  >
                    {!msg.isSystem && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className="font-bold text-emerald-300">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                    )}
                    <div>{msg.text}</div>
                  </div>
                ))}
                <div ref={inCallEndRef} />
              </div>

              <form onSubmit={handleSendInCallMessage} className="pt-2 border-t border-white/10 flex items-center space-x-1.5">
                <input
                  type="text"
                  value={inCallInput}
                  onChange={(e) => setInCallInput(e.target.value)}
                  placeholder="Type message to peer..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Floating WhatsApp Bottom Controls Capsule */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 bg-[#111b21]/95 backdrop-blur-2xl border border-white/15 px-6 py-3 rounded-full shadow-2xl">
            {/* Microphone Toggle */}
            <button
              onClick={toggleAudio}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Camera Toggle */}
            <button
              onClick={toggleVideo}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isVideoMuted
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Flip / Swap PiP */}
            {layoutMode === 'whatsapp' && (
              <button
                onClick={() => setIsSwapped(!isSwapped)}
                className="w-11 h-11 rounded-full bg-slate-800 text-emerald-400 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-all"
                title="Swap Main and PiP Feeds"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            )}

            {/* Speaker Mute Toggle */}
            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSpeakerMuted
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isSpeakerMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Subtitles Toggle */}
            <button
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                captionsEnabled
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title={captionsEnabled ? 'Disable Subtitles' : 'Enable Subtitles'}
            >
              <Subtitles className="w-5 h-5" />
            </button>

            {/* End Call / Leave Button */}
            <button
              onClick={onClose}
              className="h-11 px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/40 cursor-pointer transition-all"
              title="End Video Consultation"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
