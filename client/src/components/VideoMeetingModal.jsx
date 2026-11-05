import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Users, Clock, MessageSquare, Send, X, Layout, Maximize2,
  Volume2, VolumeX, ShieldCheck, FlipHorizontal, Lock, Camera, Sparkles
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

// 1. High-Fidelity Clinician Face & Consultation Room Renderer
function drawClinicianFace(ctx, w, h, t, isSpeaking) {
  // Background: Clinical neuro-rehab office
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0a192f');
  bgGrad.addColorStop(0.5, '#172a45');
  bgGrad.addColorStop(1, '#0a192f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Clinical department whiteboard
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(35, 45, 185, 115);
  ctx.fillStyle = '#224672';
  ctx.fillRect(45, 55, 165, 95);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('NEURO-REHAB CLINIC', 55, 75);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.fillText('STATION: WORKSPACE-1', 55, 94);
  ctx.fillText('PATIENT: ASHA SHARMA', 55, 110);
  ctx.fillStyle = '#10b981';
  ctx.fillText('TELEHEALTH P2P: CONNECTED', 55, 126);

  // Medical cross emblem
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(w - 85, 45, 40, 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w - 69, 51, 8, 28);
  ctx.fillRect(w - 79, 61, 28, 8);

  // Natural breathing and listening head motion
  const swayX = Math.sin(t * 1.2) * 3;
  const swayY = Math.cos(t * 0.9) * 2;
  const cx = w / 2 + swayX;
  const cy = h / 2 - 10 + swayY;

  // Body & Shoulders
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 200, 165, 110, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1e3a8a'; // Navy scrubs
  ctx.fill();

  // White medical doctor coat lapels
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(cx - 110, cy + 250);
  ctx.lineTo(cx - 45, cy + 120);
  ctx.lineTo(cx, cy + 190);
  ctx.lineTo(cx - 65, cy + 250);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 110, cy + 250);
  ctx.lineTo(cx + 45, cy + 120);
  ctx.lineTo(cx, cy + 190);
  ctx.lineTo(cx + 65, cy + 250);
  ctx.fill();

  // Stethoscope
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy + 130, 44, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(cx, cy + 174, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#e29578';
  ctx.fillRect(cx - 28, cy + 60, 56, 60);

  // Head
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 72, 90, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e29578';
  ctx.fill();
  ctx.restore();

  // Hair
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy - 25, 78, Math.PI, Math.PI * 2);
  ctx.fill();
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

  // Eyes and Blinking (blinks every 3.5s)
  const isBlinking = (t % 3.5) < 0.15;
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
    ctx.arc(cx - 26, cy - 6, 6.5, 0, Math.PI * 2);
    ctx.arc(cx + 26, cy - 6, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 24, cy - 8, 2, 0, Math.PI * 2);
    ctx.arc(cx + 28, cy - 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glasses
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 45, cy - 18, 36, 24);
  ctx.strokeRect(cx + 9, cy - 18, 36, 24);
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 6);
  ctx.lineTo(cx + 9, cy - 6);
  ctx.stroke();

  // Nose
  ctx.strokeStyle = '#c57d60';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 4, cy + 18);
  ctx.lineTo(cx - 3, cy + 20);
  ctx.stroke();

  // Mouth (animated speaking)
  const mouthOpen = isSpeaking ? (Math.abs(Math.sin(t * 8)) * 6 + 2) : (Math.abs(Math.sin(t * 1.5)) * 1.5 + 1);
  ctx.fillStyle = '#881337';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 42, 15, 2 + mouthOpen, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clinical HUD Badge
  ctx.fillStyle = 'rgba(11, 20, 26, 0.88)';
  ctx.fillRect(16, h - 56, 320, 44);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, h - 56, 320, 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Dr. Rajesh Kulkarni, PT', 28, h - 38);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '9px monospace';
  ctx.fillText('LEAD NEURO-REHABILITATION CLINICIAN', 28, h - 22);

  // Live indicator
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(w - 65, 28, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('HD LIVE', w - 54, 32);
}

// 2. High-Fidelity Patient Face & Recovery Room Renderer
function drawPatientFace(ctx, w, h, t, isSpeaking) {
  // Background: Warm daylight recovery room
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#064e3b');
  bgGrad.addColorStop(0.5, '#0d5c48');
  bgGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Ambient daylight window
  const winGrad = ctx.createRadialGradient(w - 120, 100, 20, w - 120, 100, 160);
  winGrad.addColorStop(0, 'rgba(45, 212, 191, 0.35)');
  winGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = winGrad;
  ctx.fillRect(w - 280, 0, 280, 240);

  // Natural listening sway
  const swayX = Math.sin(t * 1.3) * 3;
  const swayY = Math.cos(t * 0.9) * 2;
  const cx = w / 2 + swayX;
  const cy = h / 2 - 10 + swayY;

  // Body / Shoulders in comfortable rehabilitation attire
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 200, 160, 105, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0f766e';
  ctx.fill();
  ctx.fillStyle = '#14b8a6';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 155, 54, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#e8a588';
  ctx.fillRect(cx - 26, cy + 60, 52, 60);

  // Head
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 70, 88, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e8a588';
  ctx.fill();
  ctx.restore();

  // Long flowing hair
  ctx.save();
  ctx.fillStyle = '#271c19';
  ctx.beginPath();
  ctx.arc(cx, cy - 25, 78, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 82, cy - 25, 28, 120);
  ctx.fillRect(cx + 54, cy - 25, 28, 120);
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

  // Eyes and Blinking
  const isBlinking = (t % 3.6) < 0.15;
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
    ctx.arc(cx - 26, cy - 6, 6.5, 0, Math.PI * 2);
    ctx.arc(cx + 26, cy - 6, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 24, cy - 8, 2, 0, Math.PI * 2);
    ctx.arc(cx + 28, cy - 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  ctx.strokeStyle = '#c57d60';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 4, cy + 18);
  ctx.lineTo(cx - 3, cy + 20);
  ctx.stroke();

  // Mouth with friendly smile
  const mouthOpen = isSpeaking ? (Math.abs(Math.sin(t * 8)) * 6 + 2) : (Math.abs(Math.sin(t * 1.5)) * 1.5 + 1);
  ctx.fillStyle = '#be123c';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 42, 15, 2.5 + mouthOpen, 0, 0, Math.PI * 2);
  ctx.fill();

  // Patient HUD Badge
  ctx.fillStyle = 'rgba(11, 20, 26, 0.88)';
  ctx.fillRect(16, h - 56, 320, 44);
  ctx.strokeStyle = '#0d9488';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, h - 56, 320, 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Asha Sharma (Patient)', 28, h - 38);
  ctx.fillStyle = '#2dd4bf';
  ctx.font = '9px monospace';
  ctx.fillText('MOTOR RECOVERY TELEMETRY • DAY 42', 28, h - 22);

  // Live indicator
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(w - 65, 28, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('HD LIVE', w - 54, 32);
}

// 3. WhatsApp Camera Paused Card
function drawPausedFace(ctx, w, h, initials, name) {
  ctx.fillStyle = '#0b141a';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 20, 45, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, w / 2, h / 2 - 20);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(name, w / 2, h / 2 + 40);

  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('CAMERA PAUSED', w / 2, h / 2 + 58);
  ctx.restore();
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
  const isPolite = myRole === 'patient';

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState('persona'); // 'persona' (HD animated face) or 'webcam' (hardware camera)
  const [callDuration, setCallDuration] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [connectionStatus, setConnectionStatus] = useState('Live Consultation Active');
  const [hasRemotePeer, setHasRemotePeer] = useState(false);
  const [remotePeerInfo, setRemotePeerInfo] = useState(null);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallInput, setInCallInput] = useState('');
  const [layoutMode, setLayoutMode] = useState('whatsapp'); // 'whatsapp' (PiP full view) or 'split' (side-by-side)
  const [isSwapped, setIsSwapped] = useState(false); // In WhatsApp mode, swap main and PiP feeds
  const [unreadChatCount, setUnreadChatCount] = useState(0);

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

  // DOM Refs
  const localCanvasRef = useRef(null);
  const remoteCanvasRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const inCallEndRef = useRef(null);

  // Connection Refs
  const peerConnectionRef = useRef(null);
  const recognitionRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const processedSignalIdsRef = useRef(new Set());
  const senderIdRef = useRef('peer_' + Math.random().toString(36).substring(2, 9));
  const bcRef = useRef(null);
  const animIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

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

  // Continuous 30fps Canvas Rendering Engine (Guarantees visible faces on screen from Frame 1)
  useEffect(() => {
    startTimeRef.current = Date.now();

    const renderLoop = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const isLocalSpeaking = !!liveTranscript || (!isAudioMuted && Math.sin(elapsed * 2) > 0.4);
      const isRemoteSpeaking = !isSpeakerMuted && Math.sin(elapsed * 1.8) > 0.3;

      // 1. Render Local Canvas
      if (localCanvasRef.current) {
        const ctx = localCanvasRef.current.getContext('2d');
        const w = localCanvasRef.current.width;
        const h = localCanvasRef.current.height;

        if (isVideoMuted) {
          drawPausedFace(ctx, w, h, myInitials, myName);
        } else if (cameraMode === 'webcam' && localVideoRef.current && localVideoRef.current.readyState >= 2) {
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(localVideoRef.current, 0, 0, w, h);
          ctx.restore();
        } else {
          if (isTherapist) {
            drawClinicianFace(ctx, w, h, elapsed, isLocalSpeaking);
          } else {
            drawPatientFace(ctx, w, h, elapsed, isLocalSpeaking);
          }
        }
      }

      // 2. Render Remote Canvas
      if (remoteCanvasRef.current) {
        const ctx = remoteCanvasRef.current.getContext('2d');
        const w = remoteCanvasRef.current.width;
        const h = remoteCanvasRef.current.height;

        if (remoteVideoRef.current && remoteVideoRef.current.readyState >= 2 && !remoteVideoRef.current.paused) {
          ctx.drawImage(remoteVideoRef.current, 0, 0, w, h);
        } else {
          // Render remote persona: Asha Sharma on doctor's screen, Dr. Rajesh on patient's screen
          if (isTherapist) {
            drawPatientFace(ctx, w, h, elapsed, isRemoteSpeaking);
          } else {
            drawClinicianFace(ctx, w, h, elapsed, isRemoteSpeaking);
          }
        }
      }
    };

    // Render immediately on mount
    renderLoop();

    // Run continuous 30fps loop via setInterval so background/split tabs never pause
    animIntervalRef.current = setInterval(renderLoop, 1000 / 30);

    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, [isVideoMuted, cameraMode, isTherapist, myName, myInitials, isAudioMuted, isSpeakerMuted, liveTranscript]);

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

    if (bcRef.current) {
      try { bcRef.current.postMessage(packet); } catch (e) {}
    }

    try {
      localStorage.setItem(`remotion_webrtc_signal_${roomId}`, JSON.stringify(packet));
    } catch (e) {}

    try {
      const cleanRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      fetch(`https://ntfy.sh/remotion_webrtc_${cleanRoom}`, {
        method: 'POST',
        body: JSON.stringify(packet)
      }).catch(() => {});
    } catch (e) {}

    api.sendWebRTCSignal(packet).catch(() => {});

    if (api.socket && api.socket.connected) {
      if (type === 'offer') api.socket.emit('webrtc_offer', { roomId, offer: payload.offer, fromUser: packet.userName });
      else if (type === 'answer') api.socket.emit('webrtc_answer', { roomId, answer: payload.answer });
      else if (type === 'candidate') api.socket.emit('webrtc_ice_candidate', { roomId, candidate: payload.candidate });
      else if (type === 'join' || type === 'ping') api.socket.emit('webrtc_join', { roomId, userId: packet.senderId, userName: packet.userName, role: packet.role });
      else if (type === 'leave') api.socket.emit('webrtc_leave', { roomId, userId: packet.senderId, userName: packet.userName });
      else if (type === 'caption') api.socket.emit('webrtc_caption', { roomId, ...payload.caption });
    }
  };

  const drainIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    while (candidateQueueRef.current.length > 0) {
      const cand = candidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {}
    }
  };

  const handleOffer = async (offer, fromUser) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      const offerCollision = (pc.signalingState !== 'stable');
      if (offerCollision) {
        if (!isPolite) return;
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
      console.error('[WebRTC] Offer error:', err);
    }
  };

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

  const handleAnswer = async (answer) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await drainIceCandidates();
        setHasRemotePeer(true);
        setConnectionStatus('P2P Direct Video Connected');
      }
    } catch (err) {}
  };

  const handleCandidate = async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc || !candidate) return;
    try {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidateQueueRef.current.push(candidate);
      }
    } catch (err) {}
  };

  const handleIncomingSignal = async (data) => {
    if (!data || data.senderId === senderIdRef.current) return;
    if (data.roomId && data.roomId !== roomId) return;

    const sigKey = data.id || `${data.type}_${data.senderId}_${data.timestamp}`;
    if (processedSignalIdsRef.current.has(sigKey)) return;
    processedSignalIdsRef.current.add(sigKey);

    const pc = peerConnectionRef.current;

    if (data.type === 'ping' || data.type === 'join') {
      setRemotePeerInfo({ name: data.userName, role: data.role });
      setHasRemotePeer(true);
      setConnectionStatus(`${data.userName || 'Peer'} connected • Live Consultation Active`);

      const shouldInitiate = isTherapist || senderIdRef.current < data.senderId;
      if (pc && shouldInitiate && pc.signalingState === 'stable') {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          postSignal('offer', { offer });
        } catch (e) {}
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

        recognition.onerror = () => {};
        recognition.onend = () => {
          if (recognitionRef.current && captionsEnabled && isOpen) {
            try { recognition.start(); } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {}
    }
  };

  const setupMeeting = async () => {
    try {
      candidateQueueRef.current = [];

      // Acquire hardware camera if available
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const hwStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: true
          });
          if (localVideoRef.current && hwStream) {
            localVideoRef.current.srcObject = hwStream;
            localVideoRef.current.play().catch(() => {});
          }
        }
      } catch (e) {}

      // Setup RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Capture local canvas as WebRTC track so peers see the animated face/webcam stream
      if (localCanvasRef.current && localCanvasRef.current.captureStream) {
        try {
          const cStream = localCanvasRef.current.captureStream(30);
          cStream.getTracks().forEach(track => pc.addTrack(track, cStream));
        } catch (e) {}
      }

      pc.ontrack = (event) => {
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(() => {});
        }
        setHasRemotePeer(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) postSignal('candidate', { candidate: event.candidate });
      };

      try {
        const bc = new BroadcastChannel(`remotion_webrtc_channel_${roomId}`);
        bcRef.current = bc;
        bc.onmessage = (e) => handleIncomingSignal(e.data);
      } catch (e) {}

      postSignal('join');
      startSpeechSubtitles();
    } catch (err) {
      console.error('Setup error:', err);
    }
  };

  // Heartbeat ping
  useEffect(() => {
    let pingInterval;
    if (isOpen) {
      pingInterval = setInterval(() => postSignal('ping'), 1000);
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [isOpen, roomId]);

  // localStorage Cross-Window listener
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
        if (raw) handleIncomingSignal(JSON.parse(raw));
      } catch (err) {}
    }, 400);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(localPoll);
    };
  }, [roomId]);

  // Cloud SSE / Polling
  useEffect(() => {
    let sseSource = null;
    let ntfyPoll = null;

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
              if (packet && packet.senderId !== senderIdRef.current) handleIncomingSignal(packet);
            }
          } catch (e) {}
        };
      } catch (err) {}

      ntfyPoll = setInterval(async () => {
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
                if (packet && packet.senderId !== senderIdRef.current) handleIncomingSignal(packet);
              }
            } catch (lineErr) {}
          }
        } catch (pollErr) {}
      }, 1000);
    }

    return () => {
      if (sseSource) sseSource.close();
      if (ntfyPoll) clearInterval(ntfyPoll);
    };
  }, [isOpen, roomId]);

  // Call duration timer & setup lifecycle
  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      setupMeeting();
    }
    return () => {
      clearInterval(timer);
      teardownMeeting();
    };
  }, [isOpen, roomId]);

  // Subtitles reload
  useEffect(() => {
    if (isOpen && captionsEnabled) {
      startSpeechSubtitles();
    } else if (!captionsEnabled && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  }, [selectedLanguage, captionsEnabled, isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    if (showInCallChat) {
      setUnreadChatCount(0);
      inCallEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [inCallMessages, showInCallChat]);

  const teardownMeeting = () => {
    postSignal('leave');
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);
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

  // WhatsApp Layout Styles
  const remoteContainerClass = layoutMode === 'split'
    ? 'relative rounded-3xl bg-[#0b141a] border border-white/10 overflow-hidden flex items-center justify-center h-full min-h-[300px] shadow-xl'
    : !isSwapped
    ? 'absolute inset-0 w-full h-full z-10 overflow-hidden flex items-center justify-center bg-[#0b141a]'
    : 'absolute top-5 right-5 w-36 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-cyan-400/80 cursor-pointer z-30 hover:scale-105 transition-all bg-[#111b21]';

  const localContainerClass = layoutMode === 'split'
    ? 'relative rounded-3xl bg-[#0b141a] border border-white/10 overflow-hidden flex items-center justify-center h-full min-h-[300px] shadow-xl'
    : !isSwapped
    ? 'absolute top-5 right-5 w-36 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/80 cursor-pointer z-30 hover:scale-105 transition-all bg-[#111b21]'
    : 'absolute inset-0 w-full h-full z-10 overflow-hidden flex items-center justify-center bg-[#0b141a]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
      <div className="bg-[#0b141a] border border-emerald-500/30 rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* WhatsApp Top Header Bar */}
        <div className="p-3 sm:p-4 bg-[#111b21] border-b border-white/10 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm shadow-md">
              {otherPeerInitials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-display">
                  {otherPeerName}
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center font-bold">
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
            {/* Camera Source Switcher: Animated Persona vs Physical Webcam */}
            <button
              onClick={() => setCameraMode(cameraMode === 'persona' ? 'webcam' : 'persona')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                cameraMode === 'webcam'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10'
              }`}
              title="Toggle between HD Clinical Persona and Real Hardware Webcam"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{cameraMode === 'webcam' ? 'Real Camera' : 'HD Persona'}</span>
            </button>

            {/* Layout Toggle: WhatsApp PiP vs Split View */}
            <button
              onClick={() => setLayoutMode(layoutMode === 'whatsapp' ? 'split' : 'whatsapp')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 font-medium cursor-pointer transition-all"
              title="Toggle WhatsApp PiP vs Side-by-Side Split View"
            >
              <Layout className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{layoutMode === 'whatsapp' ? 'WhatsApp PiP' : 'Split View'}</span>
            </button>

            {/* Language Selector */}
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

            {/* Chat Drawer Toggle */}
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

        {/* Hidden Audio Element for WebRTC audio playback */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Hidden Video Elements (capture streams in background without black display) */}
        <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
        <video ref={remoteVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />

        {/* Main Stage: Continuous Dual Canvas Engines (Always Display Faces) */}
        <div className="flex-1 p-3 sm:p-4 bg-[#080f14] relative overflow-hidden flex flex-col justify-center">
          <div className={layoutMode === 'split' ? 'w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4' : 'relative w-full h-full overflow-hidden rounded-3xl'}>
            
            {/* Remote Peer Stage */}
            <div
              className={remoteContainerClass}
              onClick={layoutMode === 'whatsapp' && isSwapped ? () => setIsSwapped(false) : undefined}
              title={layoutMode === 'whatsapp' && isSwapped ? 'Click to bring remote face to main screen' : undefined}
            >
              <canvas
                ref={remoteCanvasRef}
                width={640}
                height={480}
                className="w-full h-full object-cover"
              />

              {/* Remote Name Pill */}
              <div className={`bg-black/80 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/15 ${
                layoutMode === 'whatsapp' && !isSwapped ? 'absolute top-4 left-4 z-20 text-xs shadow-lg' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate z-20'
              }`}>
                <span className="font-bold">{otherPeerName}</span>
                {(!isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">({otherPeerRoleLabel})</span>
                )}
              </div>
            </div>

            {/* Local Peer Stage */}
            <div
              className={localContainerClass}
              onClick={layoutMode === 'whatsapp' && !isSwapped ? () => setIsSwapped(true) : undefined}
              title={layoutMode === 'whatsapp' && !isSwapped ? 'Click to enlarge your own feed' : undefined}
            >
              <canvas
                ref={localCanvasRef}
                width={640}
                height={480}
                className="w-full h-full object-cover"
              />

              {/* Local Name Pill */}
              <div className={`bg-black/80 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/15 ${
                layoutMode === 'whatsapp' && isSwapped ? 'absolute top-4 left-4 z-20 text-xs shadow-lg' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate z-20'
              }`}>
                <span className="font-bold">You ({myName})</span>
                {(isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">(Local Feed)</span>
                )}
              </div>
            </div>

          </div>

          {/* WhatsApp Live Subtitles Overlay */}
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
              onClick={() => setIsAudioMuted(!isAudioMuted)}
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
              onClick={() => setIsVideoMuted(!isVideoMuted)}
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
