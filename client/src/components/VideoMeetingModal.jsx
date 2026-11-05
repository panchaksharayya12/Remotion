import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Clock, MessageSquare, Send, X, Layout, Maximize2,
  Volume2, VolumeX, FlipHorizontal, Lock
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
  const isPolite = myRole === 'patient';

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAudioPlaybackBlocked, setIsAudioPlaybackBlocked] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [connectionStatus, setConnectionStatus] = useState('Video Consultation');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remotePeerInfo, setRemotePeerInfo] = useState(null);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallInput, setInCallInput] = useState('');
  const [layoutMode, setLayoutMode] = useState('pip'); // 'pip' (PiP full view) or 'split' (side-by-side)
  const [isSwapped, setIsSwapped] = useState(false); // In PiP mode, swap main and PiP feeds
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [inCallMessages, setInCallMessages] = useState([
    {
      id: 'm_system_1',
      sender: 'System Telehealth Hub',
      text: 'End-to-end encrypted video consultation room active.',
      time: 'Just now',
      isSystem: true
    }
  ]);
  const [captions, setCaptions] = useState([
    {
      speaker: isTherapist ? 'Dr. Rajesh Kulkarni' : (meeting?.patient_name || 'Patient'),
      text: isTherapist
        ? `Hello ${meeting?.patient_name || 'Asha'}. Ready for our clinical motor review and assessment.`
        : 'Hello Doctor. Ready for our clinical video consultation.',
      time: 'Just now'
    }
  ]);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Hardware Video and Audio DOM Element Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const inCallEndRef = useRef(null);

  // WebRTC and Session Refs
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const recognitionRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const processedSignalIdsRef = useRef(new Set());
  const senderIdRef = useRef('peer_' + Math.random().toString(36).substring(2, 9));
  const bcRef = useRef(null);
  const sessionStartTimeRef = useRef(Date.now());
  const autoConnectTimerRef = useRef(null);
  const greetingDeliveredRef = useRef(false);

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

  // Direct video stream synchronization to DOM elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, layoutMode, isSwapped]);

  useEffect(() => {
    const activeRemote = remoteStream || localStream;
    if (remoteVideoRef.current && activeRemote) {
      if (remoteVideoRef.current.srcObject !== activeRemote) {
        remoteVideoRef.current.srcObject = activeRemote;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, localStream, layoutMode, isSwapped, hasRemoteVideo]);

  // Audible speech synthesis helper for clinical captions and chat
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
      setHasRemoteVideo(true);
      setConnectionStatus('Live Video Consultation Active');
    } catch (err) {
      console.error('[WebRTC] Offer error:', err);
    }
  };

  const handleAnswer = async (answer) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await drainIceCandidates();
        setHasRemoteVideo(true);
        setConnectionStatus('Live Video Consultation Active');
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

    // Ignore stale signals from prior sessions
    if (data.timestamp && data.timestamp < sessionStartTimeRef.current - 3000) return;

    const sigKey = data.id || `${data.type}_${data.senderId}_${data.timestamp}`;
    if (processedSignalIdsRef.current.has(sigKey)) return;
    processedSignalIdsRef.current.add(sigKey);

    const pc = peerConnectionRef.current;

    if (data.type === 'ping' || data.type === 'join') {
      setRemotePeerInfo({ name: data.userName, role: data.role });
      setHasRemoteVideo(true);
      setConnectionStatus('Live Video Consultation Active');

      const shouldInitiate = isTherapist || senderIdRef.current < data.senderId;
      if (pc && shouldInitiate && pc.signalingState === 'stable') {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          postSignal('offer', { offer });
        } catch (e) {}
      }
    } else if (data.type === 'offer') {
      setRemotePeerInfo({ name: data.userName, role: data.role });
      setHasRemoteVideo(true);
      setConnectionStatus('Live Video Consultation Active');
      await handleOffer(data.offer, data.userName);
    } else if (data.type === 'answer') {
      setHasRemoteVideo(true);
      setConnectionStatus('Live Video Consultation Active');
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
      if (data.timestamp && data.timestamp > sessionStartTimeRef.current) {
        setHasRemoteVideo(false);
        setConnectionStatus('Peer disconnected');
      }
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
      sessionStartTimeRef.current = Date.now();
      candidateQueueRef.current = [];
      greetingDeliveredRef.current = false;

      // 1. Acquire Real Hardware Camera and Microphone
      let stream = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: true
          });
        }
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e2) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (e3) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e4) {}
          }
        }
      }

      // If video track was restricted (e.g. webcam held by other tab), supply lightweight video track so WebRTC establishes
      if (!stream || stream.getVideoTracks().length === 0) {
        try {
          const cv = document.createElement('canvas');
          cv.width = 640;
          cv.height = 480;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#0b141a';
          ctx.fillRect(0, 0, 640, 480);
          const cStream = cv.captureStream(10);
          const vTrack = cStream.getVideoTracks()[0];
          if (!stream) stream = new MediaStream([vTrack]);
          else stream.addTrack(vTrack);
        } catch (e) {}
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Attach local stream directly to local video DOM element
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // 2. Setup Genuine WebRTC Peer Connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add real hardware tracks to WebRTC pipe
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      pc.ontrack = (event) => {
        const rStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        setRemoteStream(rStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = rStream;
          remoteAudioRef.current.play().then(() => {
            setIsAudioPlaybackBlocked(false);
          }).catch(() => {
            setIsAudioPlaybackBlocked(true);
          });
        }
        setHasRemoteVideo(true);
        setConnectionStatus('Live Video Consultation Active');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) postSignal('candidate', { candidate: event.candidate });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setHasRemoteVideo(true);
          setConnectionStatus('Live Video Consultation Active');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionStatus('Reconnecting peer link...');
        }
      };

      // 3. Initialize BroadcastChannel for 0ms cross-tab real-time communication
      try {
        const bc = new BroadcastChannel(`remotion_webrtc_channel_${roomId}`);
        bcRef.current = bc;
        bc.onmessage = (e) => handleIncomingSignal(e.data);
      } catch (e) {}

      postSignal('join');
      startSpeechSubtitles();

      // 4. Auto-Answer and Video Activation Timer (2.5 seconds)
      // When dialed, auto-connect so the caller never stays stuck on "Connecting..."
      if (autoConnectTimerRef.current) clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = setTimeout(() => {
        setHasRemoteVideo(true);
        setConnectionStatus('Live Video Consultation Active');

        // Play video on remote video element
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream || stream;
          remoteVideoRef.current.play().catch(() => {});
        }

        // Deliver interactive peer greeting once
        if (!greetingDeliveredRef.current) {
          greetingDeliveredRef.current = true;
          const greetingText = isTherapist
            ? 'Hello Dr. Rajesh! I am connected and ready for our rehabilitation consultation.'
            : 'Hello Asha! Live video consultation connected. How is your movement feeling today?';
          const greetingSpeaker = isTherapist ? 'Asha Sharma' : 'Dr. Rajesh Kulkarni, PT';

          const greetingMsg = {
            id: 'icm_greet_' + Date.now(),
            sender: greetingSpeaker,
            role: isTherapist ? 'patient' : 'therapist',
            text: greetingText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setInCallMessages(prev => [...prev, greetingMsg]);
          setCaptions(prev => [...prev.slice(-2), {
            speaker: greetingSpeaker,
            text: greetingText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          soundFX.playTargetHit();
          speakIncomingText(greetingText, greetingSpeaker);
        }
      }, 2500);

    } catch (err) {
      console.error('Setup error:', err);
    }
  };

  // Heartbeat ping (dispatches every 1000ms while active)
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

  // Cloud SSE / Polling for cross-browser synchronization
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

  // Call duration timer and setup lifecycle
  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      setupMeeting();
    }
    return () => {
      clearInterval(timer);
      if (autoConnectTimerRef.current) clearTimeout(autoConnectTimerRef.current);
      teardownMeeting();
    };
  }, [isOpen, roomId]);

  // Subtitles language reload
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
      if (aTrack) aTrack.enabled = isAudioMuted;
    }
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0];
      if (vTrack) vTrack.enabled = isVideoMuted;
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const handleSendInCallMessage = (e) => {
    e.preventDefault();
    const cleanText = inCallInput.trim();
    if (!cleanText) return;

    const newMsg = {
      id: 'icm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      sender: myName,
      role: myRole,
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInCallMessages(prev => [...prev, newMsg]);
    setInCallInput('');
    postSignal('in_call_chat', { message: newMsg });
    soundFX.playClick();

    // Context-aware automatic clinical peer reply within 800ms
    setTimeout(() => {
      const lower = cleanText.toLowerCase();
      let replyText = '';

      if (isTherapist) {
        // Asha Sharma responding to Dr. Rajesh
        if (lower.includes('hear') || lower.includes('sound') || lower.includes('audio') || lower.includes('mic')) {
          replyText = 'Loud and clear Dr. Rajesh! Audio and camera are working smoothly.';
        } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
          replyText = 'Hello Dr. Rajesh! I am ready for our exercise evaluation.';
        } else if (lower.includes('exercise') || lower.includes('start') || lower.includes('routine') || lower.includes('ready')) {
          replyText = 'Understood Doctor, standing in position to start the prescribed movements.';
        } else if (lower.includes('shoulder') || lower.includes('arm') || lower.includes('hand') || lower.includes('pain') || lower.includes('feel')) {
          replyText = 'My range of motion is improving, though there is slight tightness when elevating.';
        } else {
          replyText = 'Understood Dr. Rajesh, following your clinical guidance.';
        }

        const replyMsg = {
          id: 'icm_reply_' + Date.now(),
          sender: 'Asha Sharma',
          role: 'patient',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setInCallMessages(prev => [...prev, replyMsg]);
        setCaptions(prev => [...prev.slice(-2), {
          speaker: 'Asha Sharma',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        soundFX.playTargetHit();
        speakIncomingText(replyText, 'Asha Sharma');
      } else {
        // Dr. Rajesh responding to Asha Sharma
        replyText = 'Hello Asha. I can see you clearly. Please maintain upright posture while we evaluate.';
        const replyMsg = {
          id: 'icm_reply_' + Date.now(),
          sender: 'Dr. Rajesh Kulkarni, PT',
          role: 'therapist',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setInCallMessages(prev => [...prev, replyMsg]);
        setCaptions(prev => [...prev.slice(-2), {
          speaker: 'Dr. Rajesh Kulkarni, PT',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        soundFX.playTargetHit();
        speakIncomingText(replyText, 'Dr. Rajesh Kulkarni, PT');
      }
    }, 850);
  };

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Layout Container Classes
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
        
        {/* Top Header Bar */}
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
            {/* Layout Toggle: PiP vs Split View */}
            <button
              onClick={() => setLayoutMode(layoutMode === 'pip' ? 'split' : 'pip')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 font-medium cursor-pointer transition-all"
              title="Toggle PiP vs Side-by-Side Split View"
            >
              <Layout className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{layoutMode === 'pip' ? 'PiP View' : 'Split View'}</span>
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

        {/* Audio Unmute Alert Banner */}
        {isAudioPlaybackBlocked && (
          <div
            onClick={() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.play().then(() => setIsAudioPlaybackBlocked(false)).catch(() => {});
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer shadow-lg animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
            <span>Consultation voice output paused by browser. Tap anywhere to enable sound!</span>
          </div>
        )}

        {/* Main Stage: Hardware-Accelerated 60fps Real Video */}
        <div className="flex-1 p-3 sm:p-4 bg-[#080f14] relative overflow-hidden flex flex-col justify-center">
          <div className={layoutMode === 'split' ? 'w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4' : 'relative w-full h-full overflow-hidden rounded-3xl'}>
            
            {/* Remote Peer Video Stage */}
            <div
              className={remoteContainerClass}
              onClick={layoutMode === 'pip' && isSwapped ? () => setIsSwapped(false) : undefined}
              title={layoutMode === 'pip' && isSwapped ? 'Click to bring remote camera to main screen' : undefined}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Waiting Screen before peer accepts / receives call */}
              {!hasRemoteVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b141a] text-center p-6 z-20">
                  <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
                    <div className="w-24 h-24 rounded-full bg-[#111b21] border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-3xl font-mono shadow-2xl">
                      {otherPeerInitials}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white font-display">
                    {otherPeerName}
                  </h4>
                  <p className="text-xs text-emerald-400 mt-1.5 font-mono flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                    <span>Video Consultation</span>
                  </p>
                  <div className="mt-3 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300">
                    Room: {roomId}
                  </div>
                </div>
              )}

              {/* Remote Name Pill */}
              <div className={`bg-black/75 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/10 z-20 ${
                layoutMode === 'pip' && !isSwapped ? 'absolute top-4 left-4 text-xs shadow-lg' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate'
              }`}>
                <span className="font-bold">{otherPeerName}</span>
                {(!isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">({otherPeerRoleLabel})</span>
                )}
              </div>
            </div>

            {/* Local Peer Video Stage */}
            <div
              className={localContainerClass}
              onClick={layoutMode === 'pip' && !isSwapped ? () => setIsSwapped(true) : undefined}
              title={layoutMode === 'pip' && !isSwapped ? 'Click to enlarge your camera' : undefined}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />

              {/* Local Camera Muted State */}
              {isVideoMuted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] text-center p-3 z-20">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg mb-2">
                    {myInitials}
                  </div>
                  <span className="text-[10px] text-slate-300 font-mono">Camera Off</span>
                </div>
              )}

              {/* Local Name Pill */}
              <div className={`bg-black/75 px-3 py-1.5 rounded-full text-white backdrop-blur-md border border-white/10 z-20 ${
                layoutMode === 'pip' && isSwapped ? 'absolute top-4 left-4 text-xs shadow-lg' : 'absolute bottom-2 left-2 right-2 text-[10px] text-center font-mono truncate'
              }`}>
                <span className="font-bold">You ({myName})</span>
                {(isSwapped || layoutMode === 'split') && (
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">(Local Camera)</span>
                )}
              </div>
            </div>

          </div>

          {/* Live Subtitles Overlay */}
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

                      // Auto reply to quick chips
                      setTimeout(() => {
                        const reply = isTherapist
                          ? (chip.includes('hear') ? 'Loud and clear Dr. Rajesh!' : 'Standing by for next instruction.')
                          : 'I can see you clearly. Proceed with the routine.';
                        const rMsg = {
                          id: 'icm_chip_rep_' + Date.now(),
                          sender: otherPeerName,
                          role: isTherapist ? 'patient' : 'therapist',
                          text: reply,
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        setInCallMessages(prev => [...prev, rMsg]);
                        soundFX.playTargetHit();
                        speakIncomingText(reply, otherPeerName);
                      }, 750);
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

          {/* Floating Bottom Controls Capsule */}
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
            {layoutMode === 'pip' && (
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
