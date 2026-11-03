import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Globe, Subtitles,
  Users, Clock, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

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
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [connectionStatus, setConnectionStatus] = useState('Connecting to clinical room...');
  const [hasRemotePeer, setHasRemotePeer] = useState(false);
  const [captions, setCaptions] = useState([
    {
      speaker: 'Dr. Rajesh Kulkarni',
      text: 'Hello Asha. Please observe how the elbow stabilizes while reaching the upper quadrants.',
      translated: 'नमस्ते आशा। कृपया ध्यान दें कि ऊपरी चतुर्थांश तक पहुंचते समय कोहनी कैसे स्थिर होती है।',
      time: 'Just now'
    }
  ]);
  const [liveTranscript, setLiveTranscript] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);
  const candidateQueueRef = useRef([]);

  // Multi-channel local BroadcastChannel for zero-latency cross-tab WebRTC signaling
  const senderIdRef = useRef('peer_' + Math.random().toString(36).substring(2, 9));
  const bcRef = useRef(null);

  // Standardized clinical room ID
  const roomId = meeting?.room_id || 'remotion-room-pt_1';
  const isPolite = currentUser?.role === 'patient'; // Patient acts as polite peer in case of glare

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

  // Create an animated canvas video stream for fallback (if physical camera is busy or unavailable)
  const createFallbackStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      phase += 0.05;

      // Dark clinical studio background
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradient grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Animated Medical Avatar
      const isDoc = currentUser?.role === 'therapist';
      ctx.fillStyle = isDoc ? '#2563eb' : '#0d9488';
      ctx.beginPath();
      ctx.arc(320, 210, 80, 0, Math.PI * 2);
      ctx.fill();

      // Avatar Face Glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(295, 195, 10, 0, Math.PI * 2);
      ctx.arc(345, 195, 10, 0, Math.PI * 2);
      ctx.fill();

      // Animated mouth speaking wave
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(320, 230 + Math.sin(phase * 3) * 6, 20, 0, Math.PI);
      ctx.stroke();

      // Torso / Lab coat
      ctx.fillStyle = isDoc ? '#1e293b' : '#134e4a';
      ctx.beginPath();
      ctx.ellipse(320, 390, 140, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Telemetry HUD overlay on stream
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 16px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        isDoc ? 'DR. RAJESH KULKARNI (CLINICAL FEED)' : 'ASHA SHARMA (PATIENT TELEMETRY FEED)',
        320,
        50
      );

      ctx.fillStyle = '#10b981';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText(`● WEBRTC 60FPS • ROM: 82° • ACCURACY: 96%`, 320, 75);
    };

    draw();

    // Capture canvas stream at 30 FPS
    const canvasStream = canvas.captureStream ? canvas.captureStream(30) : null;

    // Attach a silent audio track so the stream conforms to standard Audio+Video WebRTC requirements
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const dst = audioCtx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const silentTrack = dst.stream.getAudioTracks()[0];
        if (silentTrack && canvasStream) {
          silentTrack.enabled = false;
          canvasStream.addTrack(silentTrack);
        }
      }
    } catch (e) {
      // AudioContext fallback optional
    }

    return canvasStream;
  };

  const setupMeeting = async () => {
    try {
      candidateQueueRef.current = [];
      let stream = null;

      // 1. Try to obtain real hardware webcam & microphone
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: true
          });
        }
      } catch (camErr) {
        console.warn('Physical camera locked or unavailable, engaging high-fidelity medical stream:', camErr);
      }

      // If camera unavailable, use high-fidelity canvas stream
      if (!stream) {
        stream = createFallbackStream();
      }

      localStreamRef.current = stream;

      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      // Listen for remote tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event);
        if (remoteVideoRef.current) {
          if (event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          } else {
            if (!remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = new MediaStream();
            }
            remoteVideoRef.current.srcObject.addTrack(event.track);
          }
          remoteVideoRef.current.play().catch(console.warn);
          setHasRemotePeer(true);
          setConnectionStatus('Connected • Live Video Call Active');
        }
      };

      // Helper to flush queued ICE candidates
      const drainIceCandidates = async () => {
        while (candidateQueueRef.current.length > 0) {
          const cand = candidateQueueRef.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn('[WebRTC] Error adding queued ICE candidate:', e);
          }
        }
      };

      // Handle ICE Candidates generated locally
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send via BroadcastChannel (local cross-window)
          if (bcRef.current) {
            bcRef.current.postMessage({
              type: 'candidate',
              senderId: senderIdRef.current,
              candidate: event.candidate
            });
          }
          // Send via Socket.IO (network)
          if (api.socket) {
            api.socket.emit('webrtc_ice_candidate', {
              roomId,
              candidate: event.candidate
            });
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] State change:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setHasRemotePeer(true);
          setConnectionStatus('Active P2P Consultation');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setHasRemotePeer(false);
          setConnectionStatus('Peer disconnected');
        }
      };

      // Common helper for incoming offer
      const handleOffer = async (offer, fromUser) => {
        try {
          const offerCollision = (pc.signalingState !== 'stable');
          if (offerCollision) {
            if (!isPolite) {
              console.log('[WebRTC] Ignoring offer due to collision (impolite peer)');
              return;
            }
            console.log('[WebRTC] Rolling back due to collision (polite peer)');
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await drainIceCandidates();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Broadcast answer locally
          if (bcRef.current) {
            bcRef.current.postMessage({
              type: 'answer',
              senderId: senderIdRef.current,
              answer
            });
          }
          // Emit answer via Socket.IO
          if (api.socket) {
            api.socket.emit('webrtc_answer', {
              roomId,
              answer
            });
          }

          setHasRemotePeer(true);
          setConnectionStatus(`Connected to ${fromUser || 'Peer'}`);
        } catch (err) {
          console.error('[WebRTC] Error answering offer:', err);
        }
      };

      // Common helper for incoming answer
      const handleAnswer = async (answer) => {
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

      // Common helper for incoming candidate
      const handleCandidate = async (candidate) => {
        try {
          if (candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              candidateQueueRef.current.push(candidate);
            }
          }
        } catch (err) {
          console.warn('[WebRTC] ICE candidate error:', err);
        }
      };

      // 3. Setup BroadcastChannel for Instant Zero-Lag Cross-Tab / Cross-Window Signaling
      try {
        const bc = new BroadcastChannel(`remotion_webrtc_channel_${roomId}`);
        bcRef.current = bc;

        bc.onmessage = async (e) => {
          const data = e.data;
          if (!data || data.senderId === senderIdRef.current) return; // Ignore own messages

          if (data.type === 'offer') {
            await handleOffer(data.offer, data.fromUser);
          } else if (data.type === 'answer') {
            await handleAnswer(data.answer);
          } else if (data.type === 'candidate') {
            await handleCandidate(data.candidate);
          } else if (data.type === 'join') {
            console.log('[BroadcastChannel] Peer joined:', data.userName);
            setConnectionStatus(`${data.userName || 'Peer'} connected. Establishing video link...`);
            // Create offer to newcomer
            try {
              if (pc.signalingState === 'stable') {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                bc.postMessage({
                  type: 'offer',
                  senderId: senderIdRef.current,
                  offer,
                  fromUser: currentUser?.name || 'Peer'
                });
                if (api.socket) {
                  api.socket.emit('webrtc_offer', { roomId, offer, fromUser: currentUser?.name });
                }
              }
            } catch (err) {
              console.warn('Error offering via broadcast channel:', err);
            }
          } else if (data.type === 'caption') {
            setCaptions(prev => [...prev.slice(-4), data.caption]);
          } else if (data.type === 'leave') {
            setHasRemotePeer(false);
            setConnectionStatus('Peer left the consultation room.');
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          }
        };

        // Notify room that this peer joined
        bc.postMessage({
          type: 'join',
          senderId: senderIdRef.current,
          userName: currentUser?.name || (currentUser?.role === 'therapist' ? 'Dr. Rajesh Kulkarni' : 'Asha Sharma'),
          role: currentUser?.role || 'patient'
        });
      } catch (bcErr) {
        console.warn('BroadcastChannel initialization error:', bcErr);
      }

      // 4. Socket.IO Signaling Handlers (for multi-device / network peers)
      if (api.socket) {
        api.socket.emit('webrtc_join', {
          roomId,
          userId: currentUser?.id || 'usr_' + Date.now(),
          userName: currentUser?.name || (currentUser?.role === 'therapist' ? 'Dr. Rajesh Kulkarni' : 'Asha Sharma'),
          role: currentUser?.role || 'patient'
        });

        api.socket.on('webrtc_room_peers', async ({ peers }) => {
          if (peers && peers.length > 0) {
            setConnectionStatus('Peer in room. Negotiating stream...');
            setTimeout(async () => {
              if (pc.signalingState === 'stable' && !hasRemotePeer) {
                try {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  api.socket.emit('webrtc_offer', { roomId, offer, fromUser: currentUser?.name || 'Caller' });
                  if (bcRef.current) {
                    bcRef.current.postMessage({ type: 'offer', senderId: senderIdRef.current, offer, fromUser: currentUser?.name });
                  }
                } catch (e) {}
              }
            }, 1200);
          } else {
            setConnectionStatus('Waiting for other participant to join...');
          }
        });

        api.socket.on('webrtc_user_joined', async (data) => {
          setConnectionStatus(`${data.userName || 'Peer'} joined. Establishing direct stream...`);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            api.socket.emit('webrtc_offer', { roomId, offer, toSocketId: data.socketId, fromUser: currentUser?.name || 'Host' });
            if (bcRef.current) {
              bcRef.current.postMessage({ type: 'offer', senderId: senderIdRef.current, offer, fromUser: currentUser?.name });
            }
          } catch (err) {}
        });

        api.socket.on('webrtc_offer', async ({ offer, fromUser }) => {
          await handleOffer(offer, fromUser);
        });

        api.socket.on('webrtc_answer', async ({ answer }) => {
          await handleAnswer(answer);
        });

        api.socket.on('webrtc_ice_candidate', async ({ candidate }) => {
          await handleCandidate(candidate);
        });

        api.socket.on('webrtc_user_left', () => {
          setHasRemotePeer(false);
          setConnectionStatus('Peer left the consultation room.');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });

        api.socket.on('webrtc_caption', (captionData) => {
          setCaptions(prev => [...prev.slice(-4), captionData]);
        });
      }

      // 5. Start speech recognition for live multilingual subtitles
      startSpeechSubtitles();

    } catch (err) {
      console.error('Fatal meeting setup error:', err);
      setConnectionStatus('Setup error: ' + err.message);
    }
  };

  // Live Speech Recognition Subtitles
  const startSpeechSubtitles = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' :
                           selectedLanguage === 'kn' ? 'kn-IN' :
                           selectedLanguage === 'ta' ? 'ta-IN' :
                           selectedLanguage === 'te' ? 'te-IN' : 'en-US';

        recognition.onresult = async (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setLiveTranscript(transcript);

          if (event.results[event.results.length - 1].isFinal) {
            let translated = transcript;
            try {
              const res = await api.translateText(transcript, 'en');
              translated = res.translated_text || transcript;
            } catch (e) {
              if (selectedLanguage === 'hi') translated = `[अनुवाद]: ${transcript}`;
              else if (selectedLanguage === 'kn') translated = `[ಅನುವಾದ]: ${transcript}`;
            }

            const newCap = {
              speaker: currentUser?.name || (currentUser?.role === 'therapist' ? 'Dr. Rajesh Kulkarni' : 'Asha Sharma'),
              text: transcript,
              translated,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setCaptions(prev => [...prev.slice(-4), newCap]);
            setLiveTranscript('');

            // Broadcast to other participant
            if (bcRef.current) {
              bcRef.current.postMessage({ type: 'caption', senderId: senderIdRef.current, caption: newCap });
            }
            if (api.socket) {
              api.socket.emit('webrtc_caption', { roomId, ...newCap });
            }
          }
        };

        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition warning:', err);
      }
    }
  };

  const teardownMeeting = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (bcRef.current) {
      try {
        bcRef.current.postMessage({ type: 'leave', senderId: senderIdRef.current });
        bcRef.current.close();
      } catch (e) {}
      bcRef.current = null;
    }
    if (api.socket) {
      api.socket.emit('webrtc_leave', {
        roomId,
        userId: currentUser?.id,
        userName: currentUser?.name
      });
      api.socket.off('webrtc_room_peers');
      api.socket.off('webrtc_user_joined');
      api.socket.off('webrtc_offer');
      api.socket.off('webrtc_answer');
      api.socket.off('webrtc_ice_candidate');
      api.socket.off('webrtc_user_left');
      api.socket.off('webrtc_caption');
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

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isTherapist = currentUser?.role === 'therapist';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="bg-[#0c1322] border border-cyan-500/30 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-display">
                  {meeting?.title || 'Weekly Kinematics Evaluation'}
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                  {connectionStatus}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Call Duration: {formatTime(callDuration)}</span>
                <span>•</span>
                <span className="text-slate-300 font-mono text-[10px]">Room: {roomId}</span>
              </div>
            </div>
          </div>

          {/* Subtitles & Language Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="hi" className="bg-slate-900">हिंदी (Hindi)</option>
                <option value="kn" className="bg-slate-900">ಕನ್ನಡ (Kannada)</option>
                <option value="ta" className="bg-slate-900">தமிழ் (Tamil)</option>
                <option value="te" className="bg-slate-900">తెలుగు (Telugu)</option>
                <option value="en" className="bg-slate-900">English</option>
              </select>
            </div>

            <button
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                captionsEnabled ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Subtitles className="w-4 h-4" />
              <span>Live Subtitles</span>
            </button>
          </div>
        </div>

        {/* Video Screen Layout (Remote Participant + Self Video) */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/70 relative overflow-hidden">
          {/* Remote Feed (Other Participant) */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${hasRemotePeer ? 'block' : 'hidden'}`}
            />

            {/* Waiting or Placeholder State if peer not yet joined */}
            {!hasRemotePeer && (
              <div className="text-center p-6 z-20">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-xl border-2 border-cyan-400/40">
                  {isTherapist ? 'AS' : 'RK'}
                </div>
                <h4 className="text-base font-bold text-white">
                  {isTherapist ? 'Asha Sharma (Patient)' : 'Dr. Rajesh Kulkarni, PT'}
                </h4>
                <p className="text-xs text-cyan-400 font-mono mt-1">
                  {isTherapist ? 'Patient Telemetry Feed' : 'Supervising Physical Therapist'}
                </p>
                <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Waiting for peer in {roomId}...</span>
                </div>
              </div>
            )}

            <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 bg-black/60 px-2.5 py-1 rounded-full text-[10px] text-white backdrop-blur-md">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{hasRemotePeer ? 'Remote Live Stream' : 'Remote Room Monitor'}</span>
            </div>
          </div>

          {/* Local Feed (Self Camera) */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : 'block'}`}
            />

            {isVideoMuted && (
              <div className="text-center p-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <VideoOff className="w-8 h-8" />
                </div>
                <div className="text-xs font-semibold text-slate-300">Camera Paused</div>
              </div>
            )}

            <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 bg-black/60 px-2.5 py-1 rounded-full text-[10px] text-white backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>You ({currentUser?.name || (isTherapist ? 'Dr. Rajesh' : 'Asha Sharma')})</span>
            </div>
          </div>

          {/* Live Multilingual Subtitles Overlay */}
          {captionsEnabled && (
            <div className="absolute bottom-6 left-6 right-6 z-30 bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/50 rounded-2xl p-4 shadow-2xl animate-slideUp">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>Real-Time Speech-to-Text & Neural Translation</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Target: English / Hindi</span>
              </div>

              <div className="space-y-1.5 max-h-24 overflow-y-auto font-sans">
                {captions.map((c, i) => (
                  <div key={i} className="text-xs flex items-start space-x-2">
                    <span className="font-bold text-cyan-300 shrink-0">{c.speaker}:</span>
                    <span className="text-slate-300 italic font-mono text-[11px]">"{c.text}"</span>
                    <span className="text-emerald-400 font-medium font-mono">[{c.translated}]</span>
                  </div>
                ))}
                {liveTranscript && (
                  <div className="text-xs text-amber-300 animate-pulse flex items-center space-x-2">
                    <span className="font-bold shrink-0">Speaking:</span>
                    <span>{liveTranscript}...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
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
