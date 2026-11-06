import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Clock, MessageSquare, Send, X, Layout, Volume2, VolumeX,
  FlipHorizontal, ShieldCheck, AlertTriangle, Check, CheckCheck
} from 'lucide-react';
import { api } from '../services/api';
import { soundFX } from '../services/audio';
import { telehealthSignaling } from '../services/telehealthSignaling';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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
  const myId = currentUser?.id || (isTherapist ? 'u_therapist_1' : 'u_patient_1');
  const roomId = meeting?.room_id || `remotion-room-${meeting?.patient_id || 'pt_1'}`;

  // Remote Participant Identity
  const remotePeerName = isTherapist
    ? (meeting?.patient_name || 'Asha Sharma')
    : (meeting?.therapist_name || 'Dr. Rajesh Kulkarni, PT');
  const remotePeerRole = isTherapist ? 'Patient' : 'Lead Physical Therapist';
  const targetPatientId = meeting?.patient_id || 'pt_1';

  // State Management
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [connectionStatus, setConnectionStatus] = useState('Initiating Call...');
  const [isCallEstablished, setIsCallEstablished] = useState(false);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallInput, setInCallInput] = useState('');
  const [layoutMode, setLayoutMode] = useState('pip'); // 'pip' or 'split'
  const [isSwapped, setIsSwapped] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // In-Call Real Messages (persisted to server, acknowledged with real delivery status)
  const [inCallMessages, setInCallMessages] = useState([]);

  // Live Captions from real microphone audio only
  const [captions, setCaptions] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState('');

  // DOM Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const inCallEndRef = useRef(null);

  // Connection & Media Refs
  const localStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const isComponentMountedRef = useRef(true);
  const sessionStartTimeRef = useRef(Date.now());

  const remotePeerInitials = remotePeerName
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

  // Load existing chat history from persistent server backend on mount
  useEffect(() => {
    let isCancelled = false;
    const fetchChatHistory = async () => {
      try {
        const res = await api.getMessages(targetPatientId);
        if (!isCancelled && res?.messages) {
          setInCallMessages(res.messages.map(m => ({
            id: m.id,
            sender: m.sender_name || (m.sender_id === myId ? myName : remotePeerName),
            senderId: m.sender_id,
            text: m.message_text,
            time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered'
          })));
        }
      } catch (e) {}
    };
    fetchChatHistory();
    return () => { isCancelled = true; };
  }, [targetPatientId, myId, myName, remotePeerName]);

  // Synchronize Local Hardware Stream strictly to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, layoutMode, isSwapped]);

  // Synchronize Remote WebRTC Stream strictly to remote video & audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    } else {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    }
  }, [remoteStream, layoutMode, isSwapped]);

  // Handle Incoming DataChannel and Signaling Packets
  const handleDataPacket = (packet) => {
    if (!packet) return;

    if (packet.type === 'caption' && packet.caption) {
      setCaptions(prev => [...prev.slice(-4), packet.caption]);
    } else if (packet.type === 'in_call_chat' && packet.message) {
      setInCallMessages(prev => {
        if (prev.some(m => m.id === packet.message.id)) return prev;
        return [...prev, { ...packet.message, status: 'delivered' }];
      });
      soundFX.playClick();
      if (!showInCallChat) setUnreadChatCount(c => c + 1);

      // Send delivery acknowledgement back to peer
      telehealthSignaling.sendData({
        type: 'chat_ack',
        messageId: packet.message.id,
        status: 'delivered'
      });
    } else if (packet.type === 'chat_ack' && packet.messageId) {
      setInCallMessages(prev => prev.map(m => (
        m.id === packet.messageId ? { ...m, status: packet.status || 'delivered' } : m
      )));
    } else if (packet.type === 'camera_toggle') {
      setIsRemoteVideoMuted(!!packet.isVideoMuted);
    }
  };

  // Real Microphone-Based Speech Recognition (Strictly processes actual spoken words)
  const startMicrophoneSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

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
                         selectedLanguage === 'te' ? 'te-IN' :
                         selectedLanguage === 'ml' ? 'ml-IN' :
                         selectedLanguage === 'mr' ? 'mr-IN' :
                         selectedLanguage === 'bn' ? 'bn-IN' : 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          const spokenText = transcript.trim();
          if (spokenText) {
            const newCaption = {
              id: 'cap_' + Date.now().toString(36),
              speaker: myName,
              speakerRole: myRole,
              text: spokenText,
              language: selectedLanguage,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setCaptions(prev => [...prev.slice(-4), newCaption]);
            setLiveTranscript('');

            // Send real speech caption directly to remote peer
            telehealthSignaling.sendData({ type: 'caption', caption: newCaption });
          }
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn('[SpeechRecognition] Note:', e.error);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current && captionsEnabled && isComponentMountedRef.current && isOpen) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[SpeechRecognition] Initialization note:', err);
    }
  };

  // Acquire Real Camera and Microphone Media
  const acquireHardwareMedia = async () => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, facingMode: 'user' },
        audio: true
      });
    } catch (e1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e2) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e3) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (e4) {
            setCameraError('Camera and microphone access could not be acquired. Please verify browser device permissions.');
          }
        }
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  // Main Session Lifecycle & Peer Connection Setup
  useEffect(() => {
    isComponentMountedRef.current = true;
    let durationTimer = null;
    let unsubSignaling = null;

    const initializeCallSession = async () => {
      setConnectionStatus('Acquiring hardware camera and audio...');
      const stream = await acquireHardwareMedia();

      if (!stream) {
        setConnectionStatus('Hardware media unavailable');
        return;
      }

      // Start call duration clock
      durationTimer = setInterval(() => setCallDuration(d => d + 1), 1000);

      // Start genuine speech recognition on local microphone
      if (captionsEnabled) {
        startMicrophoneSpeechRecognition();
      }

      // Register listener for DataChannel packets and signaling events
      unsubSignaling = telehealthSignaling.subscribe((event, data) => {
        if (!isComponentMountedRef.current) return;

        if (event === 'data') {
          handleDataPacket(data);
        } else if (event === 'call_ended') {
          setConnectionStatus('Remote participant disconnected');
          setRemoteStream(null);
          setIsCallEstablished(false);
        }
      });

      // Target Peer Identifier
      const targetRole = isTherapist ? 'patient' : 'therapist';
      const targetId = isTherapist ? (meeting?.patient_id || 'pt_1') : (currentUser?.therapist_id || 'u_therapist_1');
      const targetPeerId = telehealthSignaling.getTargetPeerId(targetId, targetRole);

      // Determine if answering an active incoming call or initiating an outgoing call
      if (telehealthSignaling.currentCall) {
        setConnectionStatus('Answering consultation call...');
        const activeCall = telehealthSignaling.answerCall(stream);

        if (activeCall) {
          activeCall.on('stream', (rStream) => {
            console.log('[WebRTC] Received remote participant media stream on answer');
            setRemoteStream(rStream);
            setIsCallEstablished(true);
            setConnectionStatus('Connected • Live Consultation Active');
            soundFX.playTargetHit();
          });

          activeCall.on('close', () => {
            setRemoteStream(null);
            setIsCallEstablished(false);
            setConnectionStatus('Consultation concluded by peer');
          });

          activeCall.on('error', (err) => {
            console.warn('[WebRTC] Call error:', err);
            setConnectionStatus('Connection interrupted');
          });
        }
      } else {
        // Dial remote peer
        setConnectionStatus(`Calling ${remotePeerName}...`);

        // Send multi-tier call alert so recipient laptop rings immediately
        api.sendCallAlert({
          targetRole,
          targetUserId: targetId,
          callerName: myName,
          callerRole: myRole,
          meetingTitle: meeting?.title || 'Clinical Video Review & Telehealth',
          roomId
        }).catch(() => {});

        const mediaCall = telehealthSignaling.dialCall(targetPeerId, stream, {
          meetingTitle: meeting?.title,
          roomId,
          patientId: targetPatientId
        });

        if (mediaCall) {
          mediaCall.on('stream', (rStream) => {
            console.log('[WebRTC] Received remote participant media stream on dial');
            setRemoteStream(rStream);
            setIsCallEstablished(true);
            setConnectionStatus('Connected • Live Consultation Active');
            soundFX.playTargetHit();
          });

          mediaCall.on('close', () => {
            setRemoteStream(null);
            setIsCallEstablished(false);
            setConnectionStatus('Consultation concluded by peer');
          });

          mediaCall.on('error', (err) => {
            console.warn('[WebRTC] Dial error:', err);
            setConnectionStatus('Calling... awaiting answer');
          });
        }
      }
    };

    if (isOpen) {
      initializeCallSession();
    }

    return () => {
      isComponentMountedRef.current = false;
      if (durationTimer) clearInterval(durationTimer);
      if (unsubSignaling) unsubSignaling();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch (e) {}
        });
      }
      telehealthSignaling.endCall();
      api.clearCallAlert().catch(() => {});
    };
  }, [isOpen, roomId]);

  // Restart speech recognition when language changes
  useEffect(() => {
    if (isOpen && captionsEnabled) {
      startMicrophoneSpeechRecognition();
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

  // Microphone Mute Toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0];
      if (aTrack) aTrack.enabled = isAudioMuted;
    }
    setIsAudioMuted(!isAudioMuted);
  };

  // Camera Toggle
  const toggleVideo = () => {
    const nextState = !isVideoMuted;
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0];
      if (vTrack) vTrack.enabled = !nextState;
    }
    setIsVideoMuted(nextState);
    telehealthSignaling.sendData({ type: 'camera_toggle', isVideoMuted: nextState });
  };

  // In-Call Message Submission (Persisted to backend, verified with server acknowledgement)
  const handleSendInCallMessage = async (e) => {
    e.preventDefault();
    const cleanText = inCallInput.trim();
    if (!cleanText) return;

    const tempId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newMsg = {
      id: tempId,
      sender: myName,
      senderId: myId,
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    };

    setInCallMessages(prev => [...prev, newMsg]);
    setInCallInput('');
    soundFX.playClick();

    // 1. Send directly to peer over WebRTC DataChannel (0ms delivery)
    telehealthSignaling.sendData({
      type: 'in_call_chat',
      message: { ...newMsg, status: 'sent' }
    });

    // 2. Persist to server backend API
    try {
      const targetUserId = isTherapist ? `u_${targetPatientId}` : 'u_therapist_1';
      const res = await api.sendMessage(targetUserId, cleanText, selectedLanguage, {
        id: tempId,
        patient_id: targetPatientId,
        sender_id: myId,
        sender_name: myName
      });

      if (res?.success || res?.message) {
        setInCallMessages(prev => prev.map(m => (
          m.id === tempId ? { ...m, status: 'sent' } : m
        )));
      }
    } catch (err) {
      console.warn('[Chat] API save note:', err);
    }
  };

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Layout Container Styles
  const remoteContainerClass = layoutMode === 'split'
    ? 'relative rounded-3xl bg-[#0b141a] border border-white/10 overflow-hidden flex items-center justify-center h-full min-h-[320px] shadow-xl'
    : !isSwapped
    ? 'absolute inset-0 w-full h-full z-10 overflow-hidden flex items-center justify-center bg-[#0b141a]'
    : 'absolute top-5 right-5 w-36 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-cyan-400/80 cursor-pointer z-30 hover:scale-105 transition-all bg-[#111b21]';

  const localContainerClass = layoutMode === 'split'
    ? 'relative rounded-3xl bg-[#0b141a] border border-white/10 overflow-hidden flex items-center justify-center h-full min-h-[320px] shadow-xl'
    : !isSwapped
    ? 'absolute top-5 right-5 w-36 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/80 cursor-pointer z-30 hover:scale-105 transition-all bg-[#111b21]'
    : 'absolute inset-0 w-full h-full z-10 overflow-hidden flex items-center justify-center bg-[#0b141a]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
      <div className="bg-[#0b141a] border border-emerald-500/30 rounded-3xl max-w-6xl w-full h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 bg-[#111b21] border-b border-white/10 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm shadow-md">
              {remotePeerInitials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-display">
                  {remotePeerName}
                </h3>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center font-bold border ${
                  isCallEstablished
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    isCallEstablished ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} />
                  {connectionStatus}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5 font-medium">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-cyan-300 font-mono">WebRTC DTLS/SRTP Peer-to-Peer Encryption</span>
                <span>•</span>
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatTime(callDuration)}</span>
              </div>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center space-x-2">
            {/* Layout Toggle */}
            <button
              onClick={() => setLayoutMode(layoutMode === 'pip' ? 'split' : 'pip')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 font-medium cursor-pointer transition-all"
              title="Toggle PiP vs Side-by-Side Split View"
            >
              <Layout className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{layoutMode === 'pip' ? 'PiP View' : 'Split View'}</span>
            </button>

            {/* Language Selector for Real Speech Captions */}
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
                <option value="ml" className="bg-slate-900">Malayalam</option>
                <option value="mr" className="bg-slate-900">Marathi</option>
                <option value="bn" className="bg-slate-900">Bengali</option>
              </select>
            </div>

            {/* In-Call Chat Toggle Button */}
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

        {/* Hidden Audio Element strictly for WebRTC remote audio playback */}
        <audio ref={remoteAudioRef} autoPlay playsInline muted={isSpeakerMuted} />

        {/* Main Stage */}
        <div className="flex-1 p-3 sm:p-4 bg-[#080f14] relative overflow-hidden flex flex-col justify-center">
          <div className={layoutMode === 'split' ? 'w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4' : 'relative w-full h-full overflow-hidden rounded-3xl'}>
            
            {/* Remote Participant Video Stage */}
            <div
              className={remoteContainerClass}
              onClick={layoutMode === 'pip' && isSwapped ? () => setIsSwapped(false) : undefined}
              title={layoutMode === 'pip' && isSwapped ? 'Click to bring remote camera to main screen' : undefined}
            >
              {/* Remote Video Element (strictly bound to remoteStream) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${!remoteStream || isRemoteVideoMuted ? 'hidden' : 'block'}`}
              />

              {/* Remote Participant Camera Off Card */}
              {remoteStream && isRemoteVideoMuted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a] text-center p-6 z-20">
                  <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-bold text-2xl mb-3">
                    {remotePeerInitials}
                  </div>
                  <h4 className="text-base font-bold text-white">{remotePeerName}</h4>
                  <span className="text-xs text-slate-400 font-mono mt-1">Camera Switched Off</span>
                </div>
              )}

              {/* Waiting / Calling State Card (shown while remote participant has not yet connected) */}
              {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a] text-center p-6 z-20">
                  <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                    <div className="w-24 h-24 rounded-full bg-[#111b21] border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-3xl font-mono shadow-2xl">
                      {remotePeerInitials}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white font-display">
                    {remotePeerName}
                  </h4>
                  <p className="text-xs text-cyan-400 mt-1.5 font-mono flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 mr-1.5 animate-pulse" />
                    <span>{connectionStatus}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mt-3 leading-relaxed">
                    Awaiting remote participant to accept the incoming video consultation on their laptop.
                  </p>
                  <div className="mt-4 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300">
                    Room: {roomId}
                  </div>
                </div>
              )}

              {/* Remote Participant Name Pill */}
              <div className={`bg-black/80 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/10 z-20 ${
                layoutMode === 'pip' && !isSwapped ? 'absolute top-4 left-4 text-xs shadow-lg' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate'
              }`}>
                <span className="font-bold">{remotePeerName}</span>
                {(!isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-cyan-400 font-mono ml-2">({remotePeerRole})</span>
                )}
              </div>
            </div>

            {/* Local Participant Video Stage (Strictly Local Preview) */}
            <div
              className={localContainerClass}
              onClick={layoutMode === 'pip' && !isSwapped ? () => setIsSwapped(true) : undefined}
              title={layoutMode === 'pip' && !isSwapped ? 'Click to enlarge your camera' : undefined}
            >
              {/* Local Video Element (strictly bound to localStream) */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover -scale-x-100 ${isVideoMuted ? 'hidden' : 'block'}`}
              />

              {/* Local Camera Switched Off Card */}
              {isVideoMuted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] text-center p-3 z-20">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg mb-2">
                    {myInitials}
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">Your Camera is Off</span>
                </div>
              )}

              {/* Local Participant Label */}
              <div className={`bg-black/80 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/10 z-20 ${
                layoutMode === 'pip' && isSwapped ? 'absolute top-4 left-4 text-xs shadow-lg' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate'
              }`}>
                <span className="font-bold">You ({myName})</span>
                {(isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">(Local Camera Preview)</span>
                )}
              </div>
            </div>

          </div>

          {/* Real Microphone-Based Speech Captions Overlay */}
          {captionsEnabled && (
            <div className="absolute bottom-24 left-6 right-6 z-30 pointer-events-none flex flex-col items-center justify-end text-center">
              {captions.length > 0 || liveTranscript ? (
                <div className="space-y-1.5 max-w-2xl px-5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 shadow-2xl">
                  {captions.slice(-2).map((c, i) => (
                    <div
                      key={c.id || i}
                      className="text-xs sm:text-sm font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                    >
                      <span className="text-cyan-300 font-bold mr-2">{c.speaker}:</span>
                      <span>"{c.text}"</span>
                    </div>
                  ))}
                  {liveTranscript && (
                    <div className="text-xs sm:text-sm font-medium text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] animate-pulse">
                      <span className="font-bold mr-1">{myName}:</span>
                      <span>{liveTranscript}...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-1.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/5 text-[11px] text-slate-400 font-mono">
                  Speak into microphone for live speech captions
                </div>
              )}
            </div>
          )}

          {/* In-Call Real-Time Text Chat Drawer */}
          {showInCallChat && (
            <div className="absolute top-4 right-4 bottom-24 w-80 sm:w-96 z-40 bg-[#111b21]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-4 shadow-2xl flex flex-col animate-slideDown">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">In-Call Chat ({remotePeerName})</span>
                </div>
                <button
                  onClick={() => setShowInCallChat(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
                {inCallMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4 text-slate-400 text-xs">
                    No messages yet in this consultation. Type below to send a message.
                  </div>
                ) : (
                  inCallMessages.map((msg) => {
                    const isMe = msg.senderId === myId || msg.sender === myName;
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-2xl max-w-[85%] ${
                          isMe
                            ? 'bg-cyan-950/80 border border-cyan-600/50 text-slate-100 ml-auto'
                            : 'bg-slate-900 border border-white/10 text-slate-100 mr-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 space-x-2">
                          <span className={`font-bold ${isMe ? 'text-cyan-300' : 'text-emerald-300'}`}>
                            {isMe ? 'You' : msg.sender}
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>{msg.time}</span>
                            {isMe && (
                              <span>
                                {msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3 h-3 text-cyan-400 inline" />
                                ) : msg.status === 'sent' ? (
                                  <Check className="w-3 h-3 text-slate-400 inline" />
                                ) : (
                                  <Clock className="w-3 h-3 text-slate-500 inline animate-pulse" />
                                )}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    );
                  })
                )}
                <div ref={inCallEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendInCallMessage} className="pt-2 border-t border-white/10 flex items-center space-x-1.5">
                <input
                  type="text"
                  value={inCallInput}
                  onChange={(e) => setInCallInput(e.target.value)}
                  placeholder={`Type message to ${remotePeerName}...`}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!inCallInput.trim()}
                  className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Floating Bottom Controls Capsule */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 bg-[#111b21]/95 backdrop-blur-2xl border border-white/15 px-6 py-3 rounded-full shadow-2xl">
            {/* Microphone Mute Toggle */}
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

            {/* Swap Feeds (PiP Mode) */}
            {layoutMode === 'pip' && (
              <button
                onClick={() => setIsSwapped(!isSwapped)}
                className="w-11 h-11 rounded-full bg-slate-800 text-cyan-400 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-all"
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
              title={isSpeakerMuted ? 'Unmute Speaker Sound' : 'Mute Speaker Sound'}
            >
              {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Subtitles Toggle */}
            <button
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                captionsEnabled
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title={captionsEnabled ? 'Disable Speech Captions' : 'Enable Speech Captions'}
            >
              <Subtitles className="w-5 h-5" />
            </button>

            {/* End Call / Leave Button */}
            <button
              onClick={onClose}
              className="h-11 px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/40 cursor-pointer transition-all"
              title="Leave Consultation"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>

        </div>

        {/* Footer Academic Disclaimer */}
        <div className="py-1.5 px-4 bg-[#080d12] border-t border-white/5 text-[10px] text-slate-500 font-mono text-center shrink-0">
          Prototype - synthetic demo data - not a medical device. Built for academic research and motor rehabilitation support.
        </div>

      </div>
    </div>
  );
}
