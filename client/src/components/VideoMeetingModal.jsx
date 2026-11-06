import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Clock, MessageSquare, Send, X, Layout, Volume2, VolumeX,
  FlipHorizontal, ShieldCheck, AlertTriangle, Check, CheckCheck,
  UserCheck, UserX, Scan
} from 'lucide-react';
import { api } from '../services/api';
import { soundFX } from '../services/audio';
import { telehealthSignaling } from '../services/telehealthSignaling';

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

  // 12-State Call State Machine (Priority 5)
  // 'idle', 'calling', 'ringing', 'accepted', 'acquiring_media', 'signaling', 'negotiating', 'connecting_ice', 'waiting_for_remote_media', 'connected', 'reconnecting', 'failed', 'ended'
  const [callState, setCallState] = useState('acquiring_media');
  const [connectionStatusText, setConnectionStatusText] = useState('Initializing media devices...');

  // Media & Device States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isRemoteVideoMuted, setIsRemoteVideoMuted] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [remoteVideoPlaying, setRemoteVideoPlaying] = useState(false);
  const [remoteCameraAvailable, setRemoteCameraAvailable] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  // Diagnostic Indicators (Priority 1 & 5)
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [iceState, setIceState] = useState('new');
  const [localTrackCount, setLocalTrackCount] = useState({ video: 0, audio: 0 });
  const [remoteTrackCount, setRemoteTrackCount] = useState({ video: 0, audio: 0 });

  // Function B - Decoupled Face Detection Presence (Priority 6)
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('searching'); // 'searching', 'detected', 'none'
  const [faceConfidence, setFaceConfidence] = useState(0);

  // In-Call Chat & Captions
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallInput, setInCallInput] = useState('');
  const [layoutMode, setLayoutMode] = useState('pip'); // 'pip' or 'split'
  const [isSwapped, setIsSwapped] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [cameraError, setCameraError] = useState(null);

  // DOM Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const inCallEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const isComponentMountedRef = useRef(true);

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

  // Load chat history from persistent server
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

  // Handle incoming DataChannel packets
  const handleDataPacket = (packet) => {
    if (!packet) return;

    if (packet.type === 'caption' && packet.caption) {
      setCaptions(prev => [...prev.slice(-4), packet.caption]);
    } else if (packet.type === 'chat' && packet.message) {
      setInCallMessages(prev => {
        if (prev.some(m => m.id === packet.message.id)) return prev;
        return [...prev, { ...packet.message, status: 'delivered' }];
      });
      soundFX.playClick();
      if (!showInCallChat) setUnreadChatCount(c => c + 1);

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
    } else if (packet.type === 'camera_availability') {
      setRemoteCameraAvailable(packet.available !== false);
    }
  };

  // Real Web Speech Recognition on local microphone
  const startMicrophoneSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

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
            telehealthSignaling.sendData({ type: 'caption', caption: newCaption });
          }
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        if (recognitionRef.current && captionsEnabled && isComponentMountedRef.current && isOpen) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {}
  };

  // Acquire local camera and microphone stream with validation
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
            setCameraError('Camera and microphone access could not be acquired. Please check device permissions.');
          }
        }
      }
    }

    if (stream) {
      const vTracks = stream.getVideoTracks();
      const aTracks = stream.getAudioTracks();
      setLocalTrackCount({ video: vTracks.length, audio: aTracks.length });
      console.log(`[WebRTC:Diagnostics] Local Media Stream Ready: Video Tracks=${vTracks.length}, Audio Tracks=${aTracks.length}`);

      if (vTracks.length === 0) {
        telehealthSignaling.sendData({ type: 'camera_availability', available: false });
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  // Attach Remote MediaStream to DOM Video & Audio Elements
  const attachRemoteStream = (incomingStream, source = 'stream_event') => {
    if (!incomingStream) return;

    const vTracks = incomingStream.getVideoTracks();
    const aTracks = incomingStream.getAudioTracks();
    console.log(`[WebRTC:Diagnostics] Remote Media Received from ${source}: Video=${vTracks.length}, Audio=${aTracks.length}`);

    setRemoteStream(incomingStream);
    setRemoteTrackCount({ video: vTracks.length, audio: aTracks.length });

    const hasLiveVideo = vTracks.length > 0 && vTracks.some(t => t.readyState === 'live');
    const hasLiveAudio = aTracks.length > 0 && aTracks.some(t => t.readyState === 'live');

    setHasRemoteVideo(hasLiveVideo);
    setHasRemoteAudio(hasLiveAudio);

    if (hasLiveVideo) {
      setCallState('connected');
      setRemoteVideoPlaying(true);
      setConnectionStatusText('Video Consultation Active');
    } else if (hasLiveAudio) {
      setCallState('waiting_for_remote_media');
      setConnectionStatusText(isTherapist ? "Waiting for patient's camera..." : "Waiting for therapist's camera...");
    }

    // Attach to remote video element with muted=true to prevent autoplay block
    if (remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== incomingStream) {
        remoteVideoRef.current.srcObject = incomingStream;
      }
      remoteVideoRef.current.muted = true;
      const playPromise = remoteVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setRemoteVideoPlaying(true);
          setCallState('connected');
        }).catch((err) => {
          console.log('[WebRTC:Playback] Play promise pending:', err);
        });
      }
    }

    // Attach to remote audio element for actual sound
    if (remoteAudioRef.current) {
      if (remoteAudioRef.current.srcObject !== incomingStream) {
        remoteAudioRef.current.srcObject = incomingStream;
      }
      remoteAudioRef.current.muted = isSpeakerMuted;
      remoteAudioRef.current.play().catch(() => {});
    }

    // Dynamic track arrival listener
    incomingStream.onaddtrack = (evt) => {
      console.log(`[WebRTC:Diagnostics] New remote track added: ${evt.track.kind}`);
      attachRemoteStream(incomingStream, 'onaddtrack');
    };

    // Track unmuting listener
    vTracks.forEach((track) => {
      track.onunmute = () => {
        console.log('[WebRTC:Diagnostics] Remote video track unmuted (RTP frames flowing)');
        setHasRemoteVideo(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = incomingStream;
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {});
        }
      };
      track.onended = () => {
        setHasRemoteVideo(false);
        setRemoteVideoPlaying(false);
      };
    });
  };

  // Main Consultation Lifecycle with Dual-Transport Signaling (Priority 1, 2, 3, 5)
  useEffect(() => {
    isComponentMountedRef.current = true;
    let durationTimer = null;
    let unsubSignaling = null;

    const initializeCallSession = async () => {
      setCallState('acquiring_media');
      setConnectionStatusText('Acquiring hardware camera and audio...');
      const stream = await acquireHardwareMedia();

      if (!stream) {
        setCallState('failed');
        setConnectionStatusText('Hardware media unavailable');
        return;
      }

      durationTimer = setInterval(() => setCallDuration(d => d + 1), 1000);

      if (captionsEnabled) {
        startMicrophoneSpeechRecognition();
      }

      unsubSignaling = telehealthSignaling.subscribe((event, data) => {
        if (!isComponentMountedRef.current) return;
        if (event === 'data') {
          handleDataPacket(data);
        } else if (event === 'call_ended') {
          setCallState('ended');
          setConnectionStatusText('Remote participant concluded consultation');
          setRemoteStream(null);
          setHasRemoteVideo(false);
          setRemoteVideoPlaying(false);
        }
      });

      const isCaller = isTherapist;
      setCallState('signaling');
      setConnectionStatusText(isCaller ? `Calling ${remotePeerName}...` : `Joining room ${roomId}...`);

      // Send serverless call alert
      const targetRole = isTherapist ? 'patient' : 'therapist';
      const targetId = isTherapist ? (meeting?.patient_id || 'pt_1') : (currentUser?.therapist_id || 'u_therapist_1');
      api.sendCallAlert({
        targetRole,
        targetUserId: targetId,
        callerName: myName,
        callerRole: myRole,
        meetingTitle: meeting?.title || 'Clinical Video Review & Telehealth',
        roomId
      }).catch(() => {});

      // Launch Unified Native WebRTC Session with Perfect Negotiation
      telehealthSignaling.setupNativeWebRTCSession({
        roomId,
        isCaller,
        localStream: stream,
        onRemoteTrack: (rStream) => {
          attachRemoteStream(rStream, 'native_ontrack');
          soundFX.playTargetHit();
        },
        onStateChange: (iceConnState, peerConnState) => {
          setIceState(iceConnState);
          if (iceConnState === 'connected' || iceConnState === 'completed') {
            setSignalingConnected(true);
            setCallState('connected');
            setConnectionStatusText('Video Consultation Active');
          } else if (iceConnState === 'failed') {
            setCallState('reconnecting');
            setConnectionStatusText('Network relay reconnecting...');
          }
        }
      });
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

  // Restart speech recognition on language change
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

  // Synchronize local preview element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, layoutMode, isSwapped]);

  // Function B: Independent Clinical Face Presence Detection (Priority 6)
  useEffect(() => {
    if (!isOpen || !remoteVideoPlaying || !remoteVideoRef.current) return;

    let isScanning = true;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanInterval = setInterval(() => {
      if (!isScanning || !remoteVideoRef.current) return;
      const video = remoteVideoRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
        try {
          ctx.drawImage(video, 0, 0, 64, 48);
          const frame = ctx.getImageData(0, 0, 64, 48);
          const data = frame.data;
          let skinPixelCount = 0;
          const totalPixels = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 10 && Math.abs(r - g) > 15) {
              skinPixelCount++;
            }
          }

          const ratio = skinPixelCount / totalPixels;
          if (ratio > 0.08) {
            setFaceDetectionStatus('detected');
            setFaceConfidence(Math.min(98, Math.round(ratio * 250)));
          } else {
            setFaceDetectionStatus('none');
            setFaceConfidence(0);
          }
        } catch (e) {
          setFaceDetectionStatus('searching');
        }
      }
    }, 600);

    return () => {
      isScanning = false;
      clearInterval(scanInterval);
    };
  }, [isOpen, remoteVideoPlaying]);

  // Microphone toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0];
      if (aTrack) aTrack.enabled = isAudioMuted;
    }
    setIsAudioMuted(!isAudioMuted);
  };

  // Camera toggle
  const toggleVideo = () => {
    const nextState = !isVideoMuted;
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0];
      if (vTrack) vTrack.enabled = !nextState;
    }
    setIsVideoMuted(nextState);
    telehealthSignaling.sendData({ type: 'camera_toggle', isVideoMuted: nextState });
  };

  // Send in-call chat message
  const handleSendInCallMessage = async (e) => {
    e.preventDefault();
    const text = inCallInput.trim();
    if (!text) return;

    const tempId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newMsg = {
      id: tempId,
      sender: myName,
      senderId: myId,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    };

    setInCallMessages(prev => [...prev, newMsg]);
    setInCallInput('');

    try {
      const res = await api.sendMessage({
        sender_id: myId,
        receiver_id: isTherapist ? (meeting?.patient_id || 'u_patient_1') : 'u_therapist_1',
        patient_id: targetPatientId,
        sender_name: myName,
        sender_role: myRole,
        message_text: text,
        created_at: new Date().toISOString()
      });

      if (res?.message) {
        setInCallMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.message.id, status: 'sent' } : m));
        telehealthSignaling.sendData({ type: 'chat', message: { ...newMsg, id: res.message.id, status: 'sent' } });
      }
    } catch (err) {
      setInCallMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'delivered' } : m));
      telehealthSignaling.sendData({ type: 'chat', message: newMsg });
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Layout container classes
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
                  callState === 'connected' && hasRemoteVideo && remoteVideoPlaying
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    callState === 'connected' || hasRemoteVideo ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} />
                  {callState === 'connected' || hasRemoteVideo
                    ? `${remotePeerName} connected - Video Consultation Active`
                    : isRemoteVideoMuted
                    ? (isTherapist ? "Patient camera is turned off" : "Therapist camera is turned off")
                    : !remoteCameraAvailable || (hasRemoteAudio && !hasRemoteVideo)
                    ? (isTherapist ? "Waiting for patient's camera..." : "Waiting for therapist's camera...")
                    : connectionStatusText
                  }
                </span>

                {/* Function B: Decoupled Face Detection Badge (Priority 6) */}
                {remoteVideoPlaying && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center border ${
                    faceDetectionStatus === 'detected'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : faceDetectionStatus === 'searching'
                      ? 'bg-slate-900 text-slate-400 border-slate-700'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`} title="Non-blocking clinical face presence indicator">
                    <Scan className="w-3 h-3 mr-1" />
                    {faceDetectionStatus === 'detected'
                      ? `Face detected (${faceConfidence}%)`
                      : faceDetectionStatus === 'searching'
                      ? 'Looking for face...'
                      : 'No face detected'
                    }
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5 font-medium">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-cyan-300 font-mono">WebRTC DTLS/SRTP Encrypted</span>
                <span>•</span>
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatTime(callDuration)}</span>
              </div>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLayoutMode(layoutMode === 'pip' ? 'split' : 'pip')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 font-medium cursor-pointer transition-all"
              title="Toggle PiP vs Side-by-Side Split View"
            >
              <Layout className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{layoutMode === 'pip' ? 'PiP View' : 'Split View'}</span>
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
                <option value="mr" className="bg-slate-900">Marathi</option>
                <option value="bn" className="bg-slate-900">Bengali</option>
              </select>
            </div>

            <button
              onClick={() => setShowInCallChat(!showInCallChat)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all relative ${
                showInCallChat
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">In-Call Chat</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hidden Audio Element for WebRTC remote audio output */}
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
                muted
                onLoadedMetadata={(e) => {
                  const { videoWidth, videoHeight } = e.target;
                  console.log(`[WebRTC:Playback] Remote video metadata loaded: ${videoWidth}x${videoHeight}`);
                  if (videoWidth > 0 && videoHeight > 0) {
                    setHasRemoteVideo(true);
                    setRemoteVideoPlaying(true);
                    setCallState('connected');
                    e.target.play().catch(() => {});
                  }
                }}
                onTimeUpdate={(e) => {
                  if (e.target.currentTime > 0 && !remoteVideoPlaying) {
                    console.log('[WebRTC:Playback] Video time advancing, frames actively rendering');
                    setRemoteVideoPlaying(true);
                    setCallState('connected');
                  }
                }}
                onPlaying={() => {
                  console.log('[WebRTC:Playback] Remote video playback active');
                  setRemoteVideoPlaying(true);
                  setCallState('connected');
                }}
                className="w-full h-full object-cover"
              />

              {/* Informative Fallback Card (shown whenever remote video is not yet received or remote participant muted video) */}
              {(!hasRemoteVideo || isRemoteVideoMuted) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a] text-center p-6 z-20">
                  <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full ${
                      isRemoteVideoMuted ? 'bg-slate-700/20' : 'bg-cyan-500/20 animate-ping'
                    }`} />
                    <div className="w-24 h-24 rounded-full bg-[#111b21] border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-3xl font-mono shadow-2xl">
                      {remotePeerInitials}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white font-display">
                    {remotePeerName}
                  </h4>
                  <div className="text-xs font-mono mt-2 flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${
                      isRemoteVideoMuted ? 'bg-amber-400' :
                      hasRemoteAudio ? 'bg-blue-400 animate-pulse' : 'bg-cyan-400 animate-pulse'
                    }`} />
                    <span className={
                      isRemoteVideoMuted ? 'text-amber-300' :
                      hasRemoteAudio ? 'text-blue-300' : 'text-cyan-400'
                    }>
                      {isRemoteVideoMuted
                        ? (isTherapist ? "Patient camera is turned off." : "Therapist camera is turned off.")
                        : !remoteCameraAvailable || (hasRemoteAudio && !hasRemoteVideo)
                        ? (isTherapist ? "Waiting for patient's camera..." : "Waiting for therapist's camera...")
                        : connectionStatusText
                      }
                    </span>
                  </div>

                  {callState === 'failed' && (
                    <button
                      onClick={() => {
                        setCallState('acquiring_media');
                        setConnectionStatusText('Retrying connection...');
                        acquireHardwareMedia().then(stream => {
                          if (stream) {
                            telehealthSignaling.setupNativeWebRTCSession({
                              roomId,
                              isCaller,
                              localStream: stream,
                              onRemoteTrack: (rStream) => attachRemoteStream(rStream, 'native_retry'),
                              onStateChange: (iceConnState) => setIceState(iceConnState)
                            });
                          }
                        });
                      }}
                      className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono cursor-pointer transition-all shadow-md"
                    >
                      Retry Connection
                    </button>
                  )}

                  <p className="text-[11px] text-slate-400 max-w-sm mt-3 leading-relaxed">
                    {isRemoteVideoMuted
                      ? "The remote participant has temporarily switched off their camera."
                      : hasRemoteAudio && !hasRemoteVideo
                      ? "Audio connection is established. Awaiting camera video track initialization."
                      : "Establishing encrypted peer-to-peer WebRTC consultation channel."
                    }
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
                className={`w-full h-full object-cover -scale-x-100 ${isVideoMuted || !localStream || localStream.getVideoTracks().length === 0 ? 'hidden' : 'block'}`}
              />

              {/* Local Camera Switched Off / Initializing Card */}
              {(isVideoMuted || !localStream || localStream.getVideoTracks().length === 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] text-center p-3 z-20">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg mb-2">
                    {myInitials}
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {isVideoMuted ? 'Your Camera is Off' : 'Camera Initializing...'}
                  </span>
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
                <div className="max-w-2xl px-5 py-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 text-white shadow-2xl space-y-1.5 animate-fadeIn">
                  {captions.slice(-2).map((cap) => (
                    <p key={cap.id} className="text-xs sm:text-sm font-medium leading-relaxed">
                      <span className="text-emerald-400 font-bold mr-1.5">{cap.speaker}:</span>
                      <span className="text-slate-100">"{cap.text}"</span>
                    </p>
                  ))}
                  {liveTranscript && (
                    <p className="text-xs sm:text-sm text-cyan-300 italic font-mono animate-pulse">
                      <span className="font-bold mr-1.5">{myName} (Speaking):</span>
                      "{liveTranscript}"
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* In-Call Real-Time Chat Drawer */}
          {showInCallChat && (
            <div className="absolute top-4 right-4 bottom-24 w-80 sm:w-96 rounded-2xl bg-[#0b141a]/95 backdrop-blur-xl border border-white/10 z-40 flex flex-col shadow-2xl overflow-hidden animate-slideInRight">
              <div className="p-3 bg-[#111b21] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">In-Call Consultation Chat</span>
                </div>
                <button
                  onClick={() => setShowInCallChat(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                {inCallMessages.map((msg) => {
                  const isMine = msg.senderId === myId || msg.sender === myName;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                        isMine
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                          : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                      }`}>
                        <div className="text-[10px] font-bold opacity-80 mb-0.5">{msg.sender}</div>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center space-x-1">
                        <span>{msg.time}</span>
                        {isMine && (
                          <span>
                            {msg.status === 'delivered' ? (
                              <CheckCheck className="w-3 h-3 text-cyan-400 inline" />
                            ) : msg.status === 'sent' ? (
                              <Check className="w-3 h-3 text-slate-400 inline" />
                            ) : (
                              <Clock className="w-2.5 h-2.5 text-slate-500 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={inCallEndRef} />
              </div>

              <form onSubmit={handleSendInCallMessage} className="p-2.5 bg-[#111b21] border-t border-white/10 flex items-center space-x-2">
                <input
                  type="text"
                  value={inCallInput}
                  onChange={(e) => setInCallInput(e.target.value)}
                  placeholder="Type message to peer..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!inCallInput.trim()}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Bottom Floating Control Bar */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 p-2 rounded-full bg-[#111b21]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
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

            <button
              onClick={() => setIsSwapped(!isSwapped)}
              className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Swap Local and Remote Video Positions"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSpeakerMuted
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isSpeakerMuted ? 'Unmute Speaker Output' : 'Mute Speaker Output'}
            >
              {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

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
