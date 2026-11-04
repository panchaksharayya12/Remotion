import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope, Users, Search, Activity, Calendar, Clock,
  Plus, Edit, Pause, Play, Trash2, Video, MessageSquare,
  BarChart3, ShieldCheck, CheckCircle2, ChevronRight, Eye,
  Sparkles, AlertCircle, RefreshCw, Layers, FileText, Check, X,
  Gamepad2, Award, Sliders, ChevronDown, PhoneOff, Mic, MicOff,
  UserPlus, UserCheck, ArrowRight, Shield, Dumbbell
} from 'lucide-react';
import { api } from '../services/api';
import VideoMeetingModal from '../components/VideoMeetingModal';
import RemoAssistant from '../components/RemoAssistant';
import ClinicalRecoveryBarChart from '../components/ClinicalRecoveryBarChart';
import PlayableGameModal from './PlayableGameModal';

const THERAPIST_TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'patients', label: 'My Patients', icon: Users },
  { id: 'details', label: 'Patient Details', icon: FileText },
  { id: 'prescriptions', label: 'Exercise Prescriptions', icon: Layers },
  { id: 'games', label: 'Game Assignments', icon: Gamepad2 },
  { id: 'live', label: 'Live Sessions', icon: Eye },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'video', label: 'Video Meetings', icon: Video },
  { id: 'analytics', label: 'Progress Analytics', icon: BarChart3 },
  { id: 'notes', label: 'Clinical Notes', icon: Edit },
  { id: 'profile', label: 'Profile', icon: Stethoscope },
];

const DEFAULT_APPOINTMENTS = [
  {
    id: 'mt_weekly_kinematics',
    title: 'Weekly Kinematics Evaluation',
    patient_id: 'pt_1',
    patient_name: 'Asha Sharma',
    therapist_name: 'Dr. Rajesh Kulkarni, PT',
    scheduled_time: 'Today at 04:30 PM',
    duration_minutes: 30,
    room_id: 'remotion-room-pt_1',
    notes: 'Upper-limb ROM evaluation and Squeeze & Fill active flexion check.',
    status: 'scheduled'
  },
  {
    id: 'mt_post_stroke_followup',
    title: 'Post-Stroke Functional Reach Review',
    patient_id: 'pt_1',
    patient_name: 'Asha Sharma',
    therapist_name: 'Dr. Rajesh Kulkarni, PT',
    scheduled_time: 'Tomorrow at 10:30 AM',
    duration_minutes: 45,
    room_id: 'remotion-room-pt_1',
    notes: 'Assess lateral shoulder abduction and virtual target reaching latency.',
    status: 'scheduled'
  }
];

// Robust Message Deduplication Helper (prevents double display & merges optimistic messages with server response)
const mergeAndDeduplicateMessages = (prevList, incoming) => {
  const merged = [...(prevList || [])];
  const items = Array.isArray(incoming) ? incoming : [incoming];

  for (const item of items) {
    if (!item || !item.message_text) continue;

    // 1. Exact ID match
    const idIdx = merged.findIndex(m => m.id === item.id);
    if (idIdx !== -1) {
      merged[idIdx] = { ...merged[idIdx], ...item };
      continue;
    }

    // 2. Fuzzy match: same sender, same text, within 15 seconds
    const fuzzyIdx = merged.findIndex(m => {
      if (m.sender_id !== item.sender_id) return false;
      if ((m.message_text || '').trim() !== (item.message_text || '').trim()) return false;
      const t1 = new Date(m.created_at || 0).getTime();
      const t2 = new Date(item.created_at || 0).getTime();
      return Math.abs(t1 - t2) < 15000;
    });

    if (fuzzyIdx !== -1) {
      merged[fuzzyIdx] = { ...merged[fuzzyIdx], ...item };
    } else {
      merged.push(item);
    }
  }

  return merged.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
};

export default function TherapistPortal({ currentUser, onOpenHeadsetModal }) {
  const [activeTab, setActiveTab] = useState('overview'); // 11 clinical tabs
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('all'); // 'all', 'stroke', 'spinal', 'ortho'
  const [loading, setLoading] = useState(true);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const syncChannelRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Helper: Verify if an incoming message strictly belongs to the currently active patient thread
  const doesMessageMatchPatient = (msg, ptId, ptUserId) => {
    if (!msg) return false;
    if (msg.patient_id && (msg.patient_id === ptId || msg.patient_id === ptUserId)) return true;
    if (msg.receiver_id && (msg.receiver_id === ptId || msg.receiver_id === ptUserId)) return true;
    if (msg.sender_id && (msg.sender_id === ptId || msg.sender_id === ptUserId)) return true;
    if (ptId === 'pt_1' && (!msg.patient_id || msg.receiver_id === 'u_patient_1' || msg.sender_id === 'u_patient_1')) return true;
    return false;
  };

  // New Patient Form State
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    condition: 'Post-Stroke Left Upper Limb Hemiparesis',
    affected_side: 'Left Upper Limb',
    level: 2,
    email: ''
  });

  // Synthesize pleasant WhatsApp-style message arrival audio blip
  const playMessageTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {}
  };

  // Auto-scroll to bottom of chat feed
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Telehealth Appointments State
  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem('remotion_all_appointments');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_APPOINTMENTS;
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    patient_id: 'pt_1',
    title: 'Weekly Kinematics Evaluation',
    date: new Date().toISOString().slice(0, 10),
    time: '04:30 PM',
    duration_minutes: 30,
    notes: 'Review active finger flexion in Squeeze & Fill and monitor lateral shoulder abduction trajectory.'
  });

  // SOAP Clinical Notes State
  const [soapNotes, setSoapNotes] = useState({
    subjective: 'Patient reports improved finger mobility during morning exercises. Minimal soreness reported at 15-rep clench threshold.',
    objective: 'Active ROM: 82° extension (+14° vs baseline). Squeeze-fill clench force sustained at 94% accuracy with zero tracking dropouts.',
    assessment: 'Stage 4 Left Hemiparesis recovery advancing on trajectory. Positive response to virtual sponge biofeedback.',
    plan: 'Continue 15-rep daily Squeeze & Fill. Introduce pronation/supination rotation at 3x weekly cadence.'
  });
  const [soapSaved, setSoapSaved] = useState(false);

  // Prescription Form State
  const [prescriptionForm, setPrescriptionForm] = useState({
    patient_id: 'pt_1',
    exercise_id: 'ex_squeeze_fill',
    target_reps: 15,
    frequency: 'Daily',
    difficulty: 'Moderate',
    duration_minutes: 15,
    instructions: 'Maintain full open hand extension between repetitions.',
    clinical_notes: 'Evaluate grip endurance and avoid wrist flexion compensation.',
    start_date: new Date().toISOString().slice(0, 10)
  });

  // Initial Data Fetch
  const loadPatients = async () => {
    try {
      const res = await api.getTherapistPatients();
      if (res?.patients && res.patients.length > 0) {
        setPatients(res.patients);
        if (!selectedPatientId) {
          setSelectedPatientId(res.patients[0].id);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load therapist patients:', err);
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const res = await api.getMeetings();
      if (res?.meetings && res.meetings.length > 0) {
        setAppointments(res.meetings);
        try {
          localStorage.setItem('remotion_all_appointments', JSON.stringify(res.meetings));
        } catch (e) {}
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadPatients();
    loadAppointments();
    const pollTimer = setInterval(loadAppointments, 2500);
    const ptPollTimer = setInterval(loadPatients, 4000); // sync newly registered patients
    return () => {
      clearInterval(pollTimer);
      clearInterval(ptPollTimer);
    };
  }, []);

  // Real-time Cloud Appointments Sync via ntfy.sh
  useEffect(() => {
    let apptSse = null;
    try {
      apptSse = new EventSource('https://ntfy.sh/remotion_appointments_sync/sse');
      apptSse.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const data = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
            if (data.appointment) {
              setAppointments(prev => [data.appointment, ...prev.filter(a => a.id !== data.appointment.id)]);
            }
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (apptSse) {
        try { apptSse.close(); } catch (e) {}
      }
    };
  }, []);

  // Load Individual Patient Details when selected
  useEffect(() => {
    if (!selectedPatientId) return;

    const loadDetail = async () => {
      try {
        const res = await api.getPatientDetails(selectedPatientId);
        setPatientDetail(res);
      } catch (err) {
        console.error('Error fetching patient details:', err);
      }
    };

    loadDetail();
  }, [selectedPatientId]);

  // Synthesize audible incoming call chime
  const playRingChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(680, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {}
  };

  // Immediate Dual-Start Video Meeting Launcher
  const startImmediateCall = (meetingData) => {
    const currentPt = patients.find(p => p.id === (meetingData?.patient_id || selectedPatientId)) || selectedPatient || patients[0];
    const meeting = {
      id: meetingData?.id || 'mt_' + Date.now().toString(36),
      title: meetingData?.title || `Clinical Review with ${currentPt?.name || 'Asha Sharma'}`,
      patient_id: currentPt?.id || 'pt_1',
      patient_name: currentPt?.name || 'Asha Sharma',
      therapist_name: 'Dr. Rajesh Kulkarni, PT',
      scheduled_time: meetingData?.scheduled_time || 'Now (Live Immediate Telehealth)',
      duration_minutes: meetingData?.duration_minutes || 30,
      room_id: meetingData?.room_id || `remotion-room-${currentPt?.id || 'pt_1'}`,
      notes: meetingData?.notes || 'Live clinical evaluation'
    };

    // 1. Immediately launch modal in Therapist portal
    setSelectedMeeting(meeting);

    // 2. Broadcast immediately to Patient portal via persistent BroadcastChannel
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({
          type: 'IMMEDIATE_START_CALL',
          callerRole: 'therapist',
          callerName: 'Dr. Rajesh Kulkarni, PT',
          meeting,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    // 3. Trigger localStorage storage event fallback (<1ms cross-window)
    try {
      localStorage.setItem('remotion_telehealth_call_signal', JSON.stringify({
        type: 'IMMEDIATE_START_CALL',
        callerRole: 'therapist',
        callerName: 'Dr. Rajesh Kulkarni, PT',
        meeting,
        timestamp: Date.now()
      }));
    } catch (e) {}

    // 4. Fast cross-browser cloud SSE dispatch via ntfy.sh (<50ms between Edge, Chrome, Safari)
    try {
      fetch('https://ntfy.sh/remotion_telehealth_alert_patient_pt_1', {
        method: 'POST',
        body: JSON.stringify({
          type: 'IMMEDIATE_START_CALL',
          callerRole: 'therapist',
          callerName: 'Dr. Rajesh Kulkarni, PT',
          meeting,
          timestamp: Date.now()
        })
      }).catch(() => {});
    } catch (e) {}

    // 5. Serverless API call alert bridge
    api.sendCallAlert({
      targetRole: 'patient',
      callerRole: 'therapist',
      callerName: 'Dr. Rajesh Kulkarni, PT',
      meeting
    }).catch(() => {});

    // 6. Relay via Socket.IO across network
    if (api.socket) {
      api.socket.emit('webrtc_call_alert', {
        callerName: 'Dr. Rajesh Kulkarni, PT',
        roomId: meeting.room_id,
        meetingTitle: meeting.title,
        targetRole: 'patient',
        targetUserId: currentPt?.user_id || 'u_patient_1'
      });
    }

    setToastMessage(`Video meeting initiated with ${meeting.patient_name}. Room: ${meeting.room_id}`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Schedule Appointment Submission
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    const targetPt = patients.find(p => p.id === scheduleForm.patient_id) || selectedPatient || patients[0];
    const newMeeting = {
      id: 'mt_' + Date.now().toString(36),
      title: scheduleForm.title.trim() || 'Clinical Kinematics Review',
      patient_id: targetPt?.id || 'pt_1',
      patient_name: targetPt?.name || 'Asha Sharma',
      therapist_name: 'Dr. Rajesh Kulkarni, PT',
      scheduled_time: `${scheduleForm.date} at ${scheduleForm.time}`,
      duration_minutes: parseInt(scheduleForm.duration_minutes, 10) || 30,
      room_id: `remotion-room-${targetPt?.id || 'pt_1'}`,
      notes: scheduleForm.notes || 'Clinical video meeting and kinematics check.',
      status: 'scheduled'
    };

    const updatedList = [newMeeting, ...appointments.filter(a => a.id !== newMeeting.id)];
    setAppointments(updatedList);
    try {
      localStorage.setItem('remotion_all_appointments', JSON.stringify(updatedList));
    } catch (err) {}

    // Sync to Patient portal via persistent BroadcastChannel
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({
          type: 'APPOINTMENT_SCHEDULED',
          appointment: newMeeting
        });
      } catch (err) {}
    }

    // Also persist via API
    try {
      await api.scheduleMeeting({
        patient_id: newMeeting.patient_id,
        title: newMeeting.title,
        scheduled_time: newMeeting.scheduled_time,
        duration_minutes: newMeeting.duration_minutes,
        notes: newMeeting.notes
      });
    } catch (apiErr) {
      console.warn('Backend API schedule sync note:', apiErr);
    }

    // Cloud pub/sub sync across Edge/Chrome
    try {
      fetch('https://ntfy.sh/remotion_appointments_sync', {
        method: 'POST',
        body: JSON.stringify({
          type: 'APPOINTMENT_SCHEDULED',
          appointment: newMeeting
        })
      }).catch(() => {});
    } catch (e) {}

    setShowScheduleModal(false);
    setToastMessage(`Video meeting scheduled with ${newMeeting.patient_name} for ${newMeeting.scheduled_time}`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  // Real-time listener for patient session completions & incoming telehealth calls
  useEffect(() => {
    // 1. Cross-tab BroadcastChannel listener for instant dual-start
    const handleTelehealthMessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'IMMEDIATE_START_CALL' && data.callerRole !== 'therapist') {
        playRingChime();
        setIncomingCall({
          callerName: data.callerName || 'Asha Sharma (Patient)',
          meetingTitle: data.meeting?.title || 'Clinical Video Meeting & Telehealth',
          roomId: data.meeting?.room_id || 'remotion-room-pt_1',
          meeting: data.meeting
        });
      } else if (data.type === 'NEW_PATIENT_REGISTERED') {
        loadPatients();
      } else if (data.type === 'APPOINTMENT_SCHEDULED' && data.appointment) {
        setAppointments(prev => [data.appointment, ...prev.filter(a => a.id !== data.appointment.id)]);
      } else if (data.type === 'CHAT_MESSAGE' && data.message) {
        setChatMessages(prev => mergeAndDeduplicateMessages(prev, data.message));
      }
    };

    try {
      const bc = new BroadcastChannel('remotion_telehealth_sync');
      syncChannelRef.current = bc;
      bc.onmessage = handleTelehealthMessage;
    } catch (e) {}

    // 2. Cross-tab localStorage fallback listener
    const handleStorageEvent = (e) => {
      if (e.key === 'remotion_telehealth_call_signal' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'IMMEDIATE_START_CALL' && data.callerRole !== 'therapist') {
            playRingChime();
            setIncomingCall({
              callerName: data.callerName || 'Asha Sharma (Patient)',
              meetingTitle: data.meeting?.title || 'Clinical Video Meeting & Telehealth',
              roomId: data.meeting?.room_id || 'remotion-room-pt_1',
              meeting: data.meeting
            });
          }
        } catch (err) {}
      } else if (e.key === 'remotion_patient_registered_signal' && e.newValue) {
        loadPatients();
      } else if (e.key === 'remotion_chat_sync_signal' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'CHAT_MESSAGE' && data.message) {
            setChatMessages(prev => mergeAndDeduplicateMessages(prev, data.message));
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Active localStorage polling for chat (every 300ms)
    const localChatPoll = setInterval(() => {
      try {
        const raw = localStorage.getItem('remotion_chat_sync_signal');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.type === 'CHAT_MESSAGE' && data.message) {
            setChatMessages(prev => mergeAndDeduplicateMessages(prev, data.message));
          }
        }
      } catch (e) {}
    }, 300);

    // Active localStorage polling fallback for calls (every 400ms)
    const localSignalPoll = setInterval(() => {
      try {
        const raw = localStorage.getItem('remotion_telehealth_call_signal');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.type === 'IMMEDIATE_START_CALL' && data.callerRole !== 'therapist' && (Date.now() - data.timestamp < 35000)) {
            setIncomingCall(prev => {
              if (prev && prev.roomId === data.meeting?.room_id) return prev;
              playRingChime();
              return {
                callerName: data.callerName || 'Asha Sharma (Patient)',
                meetingTitle: data.meeting?.title || 'Clinical Video Meeting & Telehealth',
                roomId: data.meeting?.room_id || 'remotion-room-pt_1',
                meeting: data.meeting
              };
            });
          }
        }
      } catch (e) {}
    }, 400);

    // 3. Fast cross-browser SSE listener for Call Alerts
    let sseSource = null;
    try {
      sseSource = new EventSource('https://ntfy.sh/remotion_telehealth_alert_therapist_pt_1/sse');
      sseSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const data = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
            if (data.type === 'IMMEDIATE_START_CALL' && data.callerRole !== 'therapist') {
              playRingChime();
              setIncomingCall({
                callerName: data.callerName || 'Asha Sharma (Patient)',
                meetingTitle: data.meeting?.title || 'Clinical Video Meeting & Telehealth',
                roomId: data.meeting?.room_id || 'remotion-room-pt_1',
                meeting: data.meeting
              });
            }
          }
        } catch (err) {}
      };
    } catch (e) {}

    // 4. Fast cross-browser SSE listener for Real-Time Clinician Chat
    let chatSseSource = null;
    try {
      chatSseSource = new EventSource('https://ntfy.sh/remotion_clinician_chat_sync/sse');
      chatSseSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const data = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
            if (data.type === 'CHAT_MESSAGE' && data.message) {
              setChatMessages(prev => mergeAndDeduplicateMessages(prev, data.message));
            }
          }
        } catch (e) {}
      };
    } catch (e) {}

    // Active ntfy.sh Chat JSON Polling (every 1000ms)
    const ntfyChatPoll = setInterval(async () => {
      try {
        const res = await fetch('https://ntfy.sh/remotion_clinician_chat_sync/json?since=15s');
        const text = await res.text();
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (!line) continue;
          try {
            const raw = JSON.parse(line);
            if (raw.event === 'message' && raw.message) {
              const data = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw.message;
              if (data.type === 'CHAT_MESSAGE' && data.message) {
                setChatMessages(prev => mergeAndDeduplicateMessages(prev, data.message));
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }, 1000);

    // 5. Polling Serverless call alert API
    let alertPollInterval = setInterval(async () => {
      try {
        const res = await api.getCallAlerts('therapist', 'therapist');
        if (res?.alerts && res.alerts.length > 0) {
          const latest = res.alerts[res.alerts.length - 1];
          if (latest.callerRole !== 'therapist') {
            setIncomingCall(prev => {
              if (prev && prev.roomId === latest.meeting?.room_id) return prev;
              playRingChime();
              return {
                callerName: latest.callerName || 'Asha Sharma (Patient)',
                meetingTitle: latest.meeting?.title || 'Clinical Video Meeting & Telehealth',
                roomId: latest.meeting?.room_id || 'remotion-room-pt_1',
                meeting: latest.meeting
              };
            });
          }
        }
      } catch (err) {}
    }, 800);

    // 6. Continuous fast API Chat Message polling (every 800ms)
    const apiChatPoll = setInterval(async () => {
      try {
        const targetPtId = selectedPatientId || 'pt_1';
        const res = await api.getMessages(targetPtId);
        if (res?.messages && res.messages.length > 0) {
          setChatMessages(prev => mergeAndDeduplicateMessages(prev, res.messages));
        }
      } catch (e) {}
    }, 800);

    // Socket.IO listeners
    let handleSocketIncoming = null;
    let handlePatientSession = null;
    if (api.socket) {
      handlePatientSession = (session) => {
        setToastMessage(`Live Telemetry Alert: ${session.patientName} completed ${session.repetitions_completed} reps with ${Math.round(session.accuracy_pct)}% accuracy.`);
        if (selectedPatientId === session.patientId) {
          api.getPatientDetails(selectedPatientId).then(setPatientDetail).catch(console.error);
        }
        setTimeout(() => setToastMessage(null), 7000);
      };

      handleSocketIncoming = (callData) => {
        playRingChime();
        setIncomingCall({
          callerName: callData.callerName || 'Asha Sharma (Patient)',
          meetingTitle: callData.meetingTitle || 'Clinical Telehealth Video Meeting',
          roomId: callData.roomId || `remotion-room-${selectedPatientId || 'pt_1'}`
        });
      };

      api.socket.on('patient_session_completed', handlePatientSession);
      api.socket.on('webrtc_incoming_call', handleSocketIncoming);
    }

    return () => {
      clearInterval(localChatPoll);
      clearInterval(localSignalPoll);
      clearInterval(ntfyChatPoll);
      clearInterval(alertPollInterval);
      clearInterval(apiChatPoll);
      window.removeEventListener('storage', handleStorageEvent);
      if (sseSource) { try { sseSource.close(); } catch (e) {} }
      if (chatSseSource) { try { chatSseSource.close(); } catch (e) {} }
      if (api.socket) {
        if (handlePatientSession) api.socket.off('patient_session_completed', handlePatientSession);
        if (handleSocketIncoming) api.socket.off('webrtc_incoming_call', handleSocketIncoming);
      }
    };
  }, [patients, selectedPatientId]);

  const handleOpenChat = async (targetPatient) => {
    const pt = targetPatient || selectedPatient;
    if (!pt) return;
    setIsChatOpen(true);
    setChatLoading(true);
    try {
      const res = await api.getMessages(pt.user_id || pt.id);
      setChatMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load patient messages:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Voice Recording for Chat (English Speech-to-Text)
  const toggleVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecordingVoice(true);
      recognition.onend = () => setIsRecordingVoice(false);
      recognition.onerror = () => setIsRecordingVoice(false);

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setChatInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition error:', err);
      setIsRecordingVoice(false);
    }
  };

  const handleSendTherapistMessage = async (customText = null) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || !selectedPatient) return;

    const targetUserId = selectedPatient.user_id || selectedPatient.id || 'u_patient_1';
    const tempId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const msgObj = {
      id: tempId,
      sender_id: 'u_therapist_1',
      sender_name: 'Dr. Rajesh Kulkarni, PT',
      receiver_id: targetUserId,
      message_text: textToSend,
      translated_text: textToSend,
      created_at: new Date().toISOString()
    };

    // 1. Instant optimistic local UI update (0ms, WhatsApp feel)
    setChatMessages(prev => mergeAndDeduplicateMessages(prev, msgObj));
    if (!customText) setChatInput('');

    // 2. Broadcast immediately across same-browser tabs (0ms)
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({
          type: 'CHAT_MESSAGE',
          message: msgObj,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    // 3. Store in localStorage for cross-window sync in same browser
    try {
      localStorage.setItem('remotion_chat_sync_signal', JSON.stringify({
        type: 'CHAT_MESSAGE',
        message: msgObj,
        timestamp: Date.now()
      }));
    } catch (e) {}

    // 4. Ultra-fast Cloud dispatch via ntfy.sh (<50ms across Edge, Chrome, Safari, mobile)
    try {
      fetch('https://ntfy.sh/remotion_clinician_chat_sync', {
        method: 'POST',
        body: JSON.stringify({
          type: 'CHAT_MESSAGE',
          message: msgObj,
          timestamp: Date.now()
        })
      }).catch(() => {});
    } catch (e) {}

    // 5. Persist to API with id passed to prevent duplication
    try {
      const targetLang = selectedPatient.primary_language || 'hi';
      await api.sendMessage(targetUserId, textToSend, targetLang, {
        id: tempId,
        sender_id: 'u_therapist_1',
        sender_name: 'Dr. Rajesh Kulkarni, PT'
      });
    } catch (err) {
      console.error('Failed to send therapist message:', err);
    }
  };

  // Prescription Creation Handler (Dispatches to specific patient immediately)
  const handleCreatePrescription = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetPtId = prescriptionForm.patient_id || selectedPatientId || 'pt_1';
    const targetPt = patients.find(p => p.id === targetPtId) || selectedPatient || patients[0];

    const exerciseMap = {
      ex_squeeze_fill: 'Squeeze & Fill (Hand Grasp & ROM)',
      ex_reach_touch: 'Reach & Touch (3D Spatial Coordination)',
      ex_hand_quiz: 'Hand Function Check (Dexterity Assessment)',
      ex_pronation: 'Pronation & Supination Rotation',
      ex_pinch_tracker: 'Pinch Precision Challenge'
    };

    const newPrescription = {
      id: 'rx_' + Date.now().toString(36),
      patient_id: targetPtId,
      patient_name: targetPt?.name || 'Asha Sharma',
      exercise_id: prescriptionForm.exercise_id,
      exercise_name: exerciseMap[prescriptionForm.exercise_id] || 'Squeeze & Fill (Hand Grasp & ROM)',
      target_reps: parseInt(prescriptionForm.target_reps, 10) || 15,
      frequency: prescriptionForm.frequency || 'Daily',
      difficulty: prescriptionForm.difficulty || 'Moderate',
      duration_minutes: parseInt(prescriptionForm.duration_minutes, 10) || 15,
      instructions: prescriptionForm.instructions || 'Maintain full open hand extension between repetitions.',
      clinical_notes: prescriptionForm.clinical_notes || 'Focus on active motor recruitment.',
      status: 'active',
      created_at: new Date().toISOString()
    };

    try {
      // 1. Optimistic update
      setPatientDetail(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          prescriptions: [newPrescription, ...(prev.prescriptions || []).filter(p => p.id !== newPrescription.id)]
        };
      });

      // 2. BroadcastChannel
      if (syncChannelRef.current) {
        try {
          syncChannelRef.current.postMessage({
            type: 'PRESCRIPTION_CREATED',
            patient_id: targetPtId,
            prescription: newPrescription,
            timestamp: Date.now()
          });
        } catch (e) {}
      }

      // 3. LocalStorage
      try {
        localStorage.setItem('remotion_prescription_sync_signal', JSON.stringify({
          type: 'PRESCRIPTION_CREATED',
          patient_id: targetPtId,
          prescription: newPrescription,
          timestamp: Date.now()
        }));
      } catch (e) {}

      // 4. Cloud SSE via ntfy.sh
      try {
        fetch(`https://ntfy.sh/remotion_prescriptions_sync_${targetPtId}`, {
          method: 'POST',
          body: JSON.stringify({
            type: 'PRESCRIPTION_CREATED',
            patient_id: targetPtId,
            prescription: newPrescription
          })
        }).catch(() => {});
      } catch (e) {}

      // 5. API create
      await api.createPrescription(newPrescription);

      setShowPrescriptionModal(false);
      setToastMessage(`Prescription "${newPrescription.exercise_name}" assigned to ${targetPt?.name} successfully.`);
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err) {
      console.error('Create prescription error:', err);
    }
  };

  const handleUpdateStatus = async (prescriptionId, status) => {
    try {
      await api.updatePrescription(prescriptionId, { status });
      const updated = await api.getPatientDetails(selectedPatientId);
      setPatientDetail(updated);
    } catch (err) {
      console.error('Update prescription error:', err);
    }
  };

  // Register New Patient directly into caseload
  const handleRegisterNewPatient = async (e) => {
    e.preventDefault();
    if (!newPatientForm.name.trim()) return;

    try {
      const newPt = {
        id: 'pt_' + Date.now().toString(36),
        name: newPatientForm.name.trim(),
        condition: newPatientForm.condition,
        affected_side: newPatientForm.affected_side,
        level: parseInt(newPatientForm.level, 10) || 1,
        streak: 1,
        compliance: '100%',
        total_sessions: 1,
        avg_accuracy: 90,
        peak_rom: 55,
        active_prescriptions_count: 1,
        recovery_level: `Stage ${newPatientForm.level} Recovery`,
        user_id: 'u_' + Date.now().toString(36),
        email: newPatientForm.email || `${newPatientForm.name.toLowerCase().replace(/\s+/g, '')}@example.com`
      };

      setPatients(prev => [newPt, ...prev.filter(p => p.id !== newPt.id)]);
      setSelectedPatientId(newPt.id);

      // Broadcast to other tabs & windows
      if (syncChannelRef.current) {
        try {
          syncChannelRef.current.postMessage({
            type: 'NEW_PATIENT_REGISTERED',
            patient: newPt,
            timestamp: Date.now()
          });
        } catch (e) {}
      }

      try {
        localStorage.setItem('remotion_patient_registered_signal', JSON.stringify({
          type: 'NEW_PATIENT_REGISTERED',
          patient: newPt,
          timestamp: Date.now()
        }));
      } catch (e) {}

      setShowNewPatientModal(false);
      setToastMessage(`New patient ${newPt.name} successfully registered to clinical caseload.`);
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err) {
      console.error('Register patient error:', err);
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.condition.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (patientFilter === 'stroke') return p.condition.toLowerCase().includes('stroke') || p.condition.toLowerCase().includes('hemiparesis');
    if (patientFilter === 'spinal') return p.condition.toLowerCase().includes('spinal');
    if (patientFilter === 'ortho') return p.condition.toLowerCase().includes('ortho') || p.condition.toLowerCase().includes('rom');
    return true;
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 pb-20 selection:bg-blue-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-blue-900 text-blue-50 px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border border-blue-700 animate-slideDown">
          <Sparkles className="w-5 h-5 text-blue-300 shrink-0" />
          <div className="text-xs font-semibold">{toastMessage}</div>
        </div>
      )}

      {/* Main Clinical Dashboard Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Clinical Top Header (Hospital Navy Theme) */}
        <div className="bg-gradient-to-r from-[#1e3a5f] via-[#1a3454] to-[#152a45] text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg border border-blue-400/40">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Therapist Clinical Command Center
                </h1>
                <span className="text-[11px] font-mono bg-blue-900 text-blue-200 border border-blue-700 px-2.5 py-0.5 rounded-full font-bold">
                  MCI-PT-2015-8842
                </span>
              </div>
              <p className="text-xs text-blue-200 font-mono mt-0.5 font-medium">
                Dr. Rajesh Kulkarni, PT, DPT — Senior Neuro-Rehabilitation Specialist
              </p>
              <div className="text-[11px] text-blue-100 mt-1">
                Hospital Affiliation: <span className="font-semibold text-white">Centre for Neuro Sciences</span> • {patients.length} Active Patients
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowNewPatientModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Register Patient</span>
            </button>

            <button
              onClick={() => setShowPrescriptionModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Prescription</span>
            </button>
          </div>
        </div>

        {/* 11 Clinical Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-6 scrollbar-none bg-white p-2 rounded-2xl border border-slate-200 shadow-sm sticky top-16 z-20">
          {THERAPIST_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Caseload High-Level Metric Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold block">Active Caseload</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{patients.length} Patients</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">100% Biomechanical Compliance</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold block">Avg Recovery Accuracy</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">94.2%</div>
                <div className="text-[11px] text-slate-500 mt-1">+8.4% vs Baseline evaluation</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold block">Peak Active ROM</span>
                <div className="text-2xl font-black text-blue-600 mt-1">82° Flexion</div>
                <div className="text-[11px] text-blue-700 font-bold mt-1">Target: 85° Discharge</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold block">Telehealth Readiness</span>
                <div className="text-2xl font-black text-teal-600 mt-1">Online</div>
                <div className="text-[11px] text-slate-500 mt-1">Direct WebRTC P2P Active</div>
              </div>
            </div>

            {/* Upcoming Video Meetings Banner */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <Video className="w-5 h-5 text-blue-600" />
                    <span>Scheduled Video Meetings & Telehealth Suite</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct peer-to-peer WebRTC video stream with real-time MediaPipe kinematics and electronic record logging.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Schedule Video Meeting</span>
                  </button>

                  <button
                    onClick={() => startImmediateCall({
                      title: `Immediate Clinical Review with ${selectedPatient?.name || 'Asha Sharma'}`,
                      patient_id: selectedPatient?.id || 'pt_1',
                      patient_name: selectedPatient?.name || 'Asha Sharma',
                      room_id: `remotion-room-${selectedPatient?.id || 'pt_1'}`
                    })}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Start Video Meeting ({selectedPatient?.name || 'Asha Sharma'})</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Appointment Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.slice(0, 2).map((appt) => (
                  <div key={appt.id} className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-blue-950">{appt.title}</span>
                        <span className="text-[10px] font-mono bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                          {appt.status || 'SCHEDULED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        Patient: <span className="font-bold text-slate-900">{appt.patient_name || 'Asha Sharma'}</span>
                      </p>
                      <div className="text-xs font-mono text-blue-700 font-semibold mt-1 flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{appt.scheduled_time} ({appt.duration_minutes || 30} mins)</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between">
                      <button
                        onClick={() => startImmediateCall(appt)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Launch Video Meeting</span>
                      </button>
                      <span className="text-[11px] text-emerald-600 font-mono font-medium flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Dual-Start Ready</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Realistic 3D Clinical Bar Graph */}
            <ClinicalRecoveryBarChart
              patientName={selectedPatient?.name || 'Asha Sharma'}
              targetRom={85}
              baselineRom={42}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY PATIENTS                                                        */}
        {/* ========================================================================= */}
        {activeTab === 'patients' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Assigned Patient Registry & Caseload</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage rehabilitation programs, initiate instant telehealth video meetings, and track motor stages.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewPatientModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 self-start sm:self-auto shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register New Patient</span>
                </button>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search patient name, condition, or affected side..."
                    className="w-full bg-slate-50 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold">
                  {['all', 'stroke', 'spinal', 'ortho'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setPatientFilter(f)}
                      className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                        patientFilter === f
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f === 'all' ? 'All Patients' : `${f} Rehab`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      p.id === selectedPatientId
                        ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                            <p className="text-[11px] text-blue-700 font-medium">{p.condition}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          Lvl {p.level || 3}
                        </span>
                      </div>

                      <div className="my-3 py-2 border-y border-slate-100 text-xs font-mono grid grid-cols-2 gap-2 text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block">COMPLIANCE</span>
                          <span className="font-bold text-emerald-600">{p.compliance || '96%'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">PEAK ROM</span>
                          <span className="font-bold text-blue-600">{p.peak_rom || 82}°</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center space-x-2">
                      <button
                        onClick={() => startImmediateCall({
                          title: `Clinical Video Review with ${p.name}`,
                          patient_id: p.id,
                          patient_name: p.name,
                          room_id: `remotion-room-${p.id}`
                        })}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Start Video Meeting</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setActiveTab('details');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Dossier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PATIENT DETAILS                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'details' && selectedPatient && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4 mb-6">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedPatient.name}</h2>
                    <span className="text-xs font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-full">
                      {selectedPatient.recovery_level || 'Stage 4 Recovery'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 font-medium mt-1">
                    {selectedPatient.condition} • Affected: <span className="font-bold">{selectedPatient.affected_side || 'Left Upper Limb'}</span> • Age: 58 • Onset: 4 months ago
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenChat(selectedPatient)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Clinician Chat</span>
                  </button>

                  <button
                    onClick={() => startImmediateCall({
                      title: `Clinical Review with ${selectedPatient.name}`,
                      patient_id: selectedPatient.id,
                      patient_name: selectedPatient.name,
                      room_id: `remotion-room-${selectedPatient.id}`
                    })}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Start Video Meeting</span>
                  </button>
                </div>
              </div>

              {/* Clinical Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-xs font-mono">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] block font-bold">TOTAL SESSIONS</span>
                  <span className="text-xl font-black text-slate-900">{selectedPatient.total_sessions || 6} Completed</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] block font-bold">AVG ACCURACY</span>
                  <span className="text-xl font-black text-emerald-600">{Math.round(selectedPatient.avg_accuracy || 94)}%</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] block font-bold">PEAK ACTIVE ROM</span>
                  <span className="text-xl font-black text-blue-600">{selectedPatient.peak_rom || 82}°</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] block font-bold">FUGL-MEYER SCORE</span>
                  <span className="text-xl font-black text-purple-600">46 / 66</span>
                </div>
              </div>

              {/* Longitudinal Recovery Graph */}
              <ClinicalRecoveryBarChart
                patientName={selectedPatient.name}
                targetRom={85}
                baselineRom={42}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXERCISE PRESCRIPTIONS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Prescription Builder Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Clinical Exercise Prescription Suite</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Build and dispatch tailored motor rehabilitation protocols. Prescriptions synchronize instantly to the target patient portal.
                </p>
              </div>

              <form onSubmit={handleCreatePrescription} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                      Target Patient *
                    </label>
                    <select
                      value={prescriptionForm.patient_id}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patient_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.condition}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                      Exercise Routine / Protocol *
                    </label>
                    <select
                      value={prescriptionForm.exercise_id}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, exercise_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="ex_squeeze_fill">Squeeze & Fill (Hand Grasp & Active ROM)</option>
                      <option value="ex_reach_touch">Reach & Touch (3D Spatial Coordination)</option>
                      <option value="ex_hand_quiz">Hand Function Check (Dexterity Assessment)</option>
                      <option value="ex_pronation">Pronation & Supination Rotation</option>
                      <option value="ex_pinch_tracker">Pinch Precision Challenge</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                      Target Repetitions
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={prescriptionForm.target_reps}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, target_reps: parseInt(e.target.value) || 10 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                      Frequency
                    </label>
                    <select
                      value={prescriptionForm.frequency}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Daily">Daily (Standard Rehabilitation)</option>
                      <option value="Twice Daily">Twice Daily (Intensive)</option>
                      <option value="3x Weekly">3x Weekly (Maintenance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={prescriptionForm.difficulty}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, difficulty: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="Gentle">Gentle (Reduced resistance)</option>
                      <option value="Moderate">Moderate (Standard protocol)</option>
                      <option value="Advanced">Advanced (High precision & speed)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                    Patient Instructions
                  </label>
                  <input
                    type="text"
                    value={prescriptionForm.instructions}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center space-x-2 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dispatch Prescription to Patient Portal</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Prescriptions Table for Selected Patient */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  Active Prescriptions for {selectedPatient?.name || 'Asha Sharma'}
                </h3>
                <span className="text-xs font-mono bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                  {patientDetail?.prescriptions?.length || 2} Prescribed Tasks
                </span>
              </div>

              <div className="space-y-3">
                {patientDetail?.prescriptions?.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          {p.exercise_name || p.game_title || 'Rehabilitation Routine'}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                          p.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{p.instructions}"
                      </p>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        Target: {p.target_reps} Reps • {p.frequency} • {p.difficulty} Difficulty
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {p.status === 'active' ? (
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'paused')}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs cursor-pointer"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'active')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs cursor-pointer"
                        >
                          Resume
                        </button>
                      )}

                      <button
                        onClick={() => handleUpdateStatus(p.id, 'discontinued')}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Discontinue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: GAME ASSIGNMENTS                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <Gamepad2 className="w-5 h-5 text-blue-600" />
                  <span>VR Serious Games & Biofeedback Assignment</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure interactive virtual motor challenges with custom kinematic target thresholds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'gm_squeeze',
                    title: 'Sponge Squeeze 3D',
                    category: 'Finger Flexion & Grasp',
                    desc: 'Virtual hydrologic sponge compression tracking active finger closure and peak isometric hold.',
                    target: '15 Reps'
                  },
                  {
                    id: 'gm_reacher',
                    title: 'Star Reacher 3D',
                    category: 'Spatial Upper-Limb Coordination',
                    desc: 'Floating stellar constellations requiring multi-directional shoulder abduction and elbow extension.',
                    target: '20 Stars'
                  },
                  {
                    id: 'gm_rhythm',
                    title: 'Rhythm Kinematics',
                    category: 'Reaction Speed & Agility',
                    desc: 'Synchronized visual pulses testing motor timing, bilateral symmetry, and deceleration control.',
                    target: '10 Waves'
                  },
                  {
                    id: 'gm_zen',
                    title: 'Zen Garden Precision',
                    category: 'Fine Motor & Pinch Grip',
                    desc: 'Sub-millimeter finger pinch manipulation placing smooth river stones on virtual patterns.',
                    target: '12 Stones'
                  }
                ].map(game => (
                  <div key={game.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-slate-900">{game.title}</h4>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          {game.target}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mb-1">{game.category}</p>
                      <p className="text-xs text-slate-600 mt-1">{game.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-emerald-600 font-bold">Biofeedback: Active</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedGame(game)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play 3D</span>
                        </button>
                        <button
                          onClick={() => {
                            setToastMessage(`Assigned ${game.title} to ${selectedPatient?.name || 'Asha Sharma'}.`);
                            setTimeout(() => setToastMessage(null), 5000);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                        >
                          Assign to Patient
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: LIVE SESSIONS & MONITOR                                            */}
        {/* ========================================================================= */}
        {activeTab === 'live' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <span>Real-Time Joint Kinematics Telemetry</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live MediaPipe 60 FPS Optical Hand & Upper-Limb Goniometer Stream.
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sensor Stream Active (60 FPS)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="relative rounded-2xl bg-slate-900 h-80 overflow-hidden flex items-center justify-center text-white">
                  <div className="text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-lg">
                      {selectedPatient?.name?.slice(0, 2).toUpperCase() || 'AS'}
                    </div>
                    <div className="text-sm font-bold text-white">Live Patient Kinematics Feed</div>
                    <div className="text-xs text-slate-400 mt-1">{selectedPatient?.name || 'Asha Sharma'} • Left Upper Limb</div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded text-[10px] text-emerald-400 font-mono">
                    Tracking Confidence: 99.4% • Latency: 14ms
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">SHOULDER ABDUCTION</span>
                      <span className="text-2xl font-black text-blue-700">76.4°</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">FINGER EXTENSION SPAN</span>
                      <span className="text-2xl font-black text-emerald-700">88.2%</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">TREMOR SPECTRUM</span>
                      <span className="text-2xl font-black text-slate-800">1.2 Hz (Normal)</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">REACTION LATENCY</span>
                      <span className="text-2xl font-black text-amber-700">340 ms</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                    Patient actively completing prescribed Squeeze & Fill protocol. Steady neuromuscular recruitment observed.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: APPOINTMENTS                                                       */}
        {/* ========================================================================= */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span>Clinical Appointments & Scheduled Video Meetings</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Telehealth appointments update automatically in patient portals in real time.
                  </p>
                </div>

                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Video Meeting</span>
                </button>
              </div>

              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                        <Video className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 text-sm">{appt.title}</h4>
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                            {appt.duration_minutes || 30} MINS
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-semibold">
                          Patient: <span className="text-slate-900">{appt.patient_name || 'Asha Sharma'}</span>
                        </p>
                        <div className="text-xs font-mono text-blue-700 font-semibold mt-1 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{appt.scheduled_time}</span>
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-xl border border-slate-200 max-w-xl">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <button
                        onClick={() => startImmediateCall(appt)}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center space-x-2 cursor-pointer w-full sm:w-auto"
                      >
                        <Video className="w-4 h-4" />
                        <span>Launch Video Meeting</span>
                      </button>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">Dual-Start Video Meeting Sync</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: VIDEO MEETINGS SUITE                                               */}
        {/* ========================================================================= */}
        {activeTab === 'video' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                    <Video className="w-5 h-5 text-blue-600" />
                    <span>Clinical Telehealth Video Meetings Suite</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Encrypted direct WebRTC video meetings with automatic dual-start notification.
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{patients.length} Patients Available</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((pt) => (
                  <div key={pt.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900">{pt.name}</span>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          {pt.condition || 'Neuro-Rehab'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-mono">
                        Compliance: <span className="font-bold text-emerald-600">{pt.compliance || '94%'}</span> • Level: <span className="font-bold text-blue-600">{pt.level || '3'}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center space-x-2">
                      <button
                        onClick={() => startImmediateCall({
                          title: `Clinical Video Meeting with ${pt.name}`,
                          patient_id: pt.id,
                          patient_name: pt.name,
                          room_id: `remotion-room-${pt.id}`
                        })}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Start Video Meeting</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: PROGRESS ANALYTICS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            <ClinicalRecoveryBarChart
              patientName={selectedPatient?.name || 'Asha Sharma'}
              targetRom={85}
              baselineRom={42}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: CLINICAL NOTES (SOAP)                                             */}
        {/* ========================================================================= */}
        {activeTab === 'notes' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Clinical SOAP Documentation (EMR Audit Trail)</span>
                </h3>
                <button
                  onClick={() => {
                    setSoapSaved(true);
                    setTimeout(() => setSoapSaved(false), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  {soapSaved ? <Check className="w-4 h-4" /> : null}
                  <span>{soapSaved ? 'Note Saved' : 'Save SOAP Note'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    S — Subjective
                  </label>
                  <textarea
                    rows="3"
                    value={soapNotes.subjective}
                    onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    O — Objective
                  </label>
                  <textarea
                    rows="3"
                    value={soapNotes.objective}
                    onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    A — Assessment
                  </label>
                  <textarea
                    rows="3"
                    value={soapNotes.assessment}
                    onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    P — Plan
                  </label>
                  <textarea
                    rows="3"
                    value={soapNotes.plan}
                    onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 11: PROFILE                                                           */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn max-w-3xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center space-x-4 pb-6 border-b border-slate-100 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  RK
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Dr. Rajesh Kulkarni, PT, DPT</h3>
                  <p className="text-xs text-slate-500">Supervising Neuro-Physiotherapist • License MCI-PT-2015-8842</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-mono">Affiliation</span>
                  <span className="font-bold text-slate-800">Centre for Neuro Sciences & Rehabilitation</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-mono">Specialization</span>
                  <span className="font-bold text-blue-700">Upper Limb Post-Stroke Motor Recovery & Biofeedback</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-mono">Telehealth Room ID</span>
                  <span className="font-bold text-slate-800">remotion-room-pt_1</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prescription Builder Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Build Clinical Exercise Prescription
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Prescribe for: <span className="text-blue-700 font-bold">{selectedPatient?.name}</span> (Synchronizes instantly via WebSocket)
            </p>

            <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Select Activity / Exercise</label>
                <select
                  value={prescriptionForm.exercise_id}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, exercise_id: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                >
                  <option value="ex_squeeze_fill">Squeeze & Fill (Hand Grasp & ROM)</option>
                  <option value="ex_reach_touch">Reach & Touch (3D Spatial Coordination)</option>
                  <option value="ex_hand_quiz">Hand Function Check (Dexterity Assessment)</option>
                  <option value="ex_pronation">Pronation & Supination Rotation</option>
                  <option value="ex_pinch_tracker">Pinch Precision Challenge</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Target Repetitions</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={prescriptionForm.target_reps}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, target_reps: parseInt(e.target.value) || 10 })}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Frequency</label>
                  <select
                    value={prescriptionForm.frequency}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="3x Weekly">3x Weekly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Patient Instructions</label>
                <textarea
                  rows="2"
                  value={prescriptionForm.instructions}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs font-sans"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Dispatch to Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Register New Rehabilitation Patient
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Add a new patient directly into your active clinical caseload.
            </p>

            <form onSubmit={handleRegisterNewPatient} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Clinical Condition / Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-Stroke Left Hemiparesis"
                  value={newPatientForm.condition}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, condition: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Affected Side</label>
                  <select
                    value={newPatientForm.affected_side}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, affected_side: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="Left Upper Limb">Left Upper Limb</option>
                    <option value="Right Upper Limb">Right Upper Limb</option>
                    <option value="Bilateral">Bilateral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Motor Recovery Level</label>
                  <select
                    value={newPatientForm.level}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, level: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value={1}>Stage 1 (Initial Synergies)</option>
                    <option value={2}>Stage 2 (Spasticity Onset)</option>
                    <option value={3}>Stage 3 (Voluntary Movement)</option>
                    <option value={4}>Stage 4 (Active ROM Extension)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Register to Caseload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multilingual Patient Communication Modal */}
      {isChatOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full h-[620px] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {selectedPatient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center space-x-2">
                    <span>Clinical Channel: {selectedPatient.name}</span>
                    <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      Primary: {selectedPatient.primary_language?.toUpperCase() || 'HI'}
                    </span>
                  </h4>
                  <div className="text-[11px] text-blue-100">
                    {selectedPatient.condition}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 text-sm font-bold flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Caseload Patient Selector Tabs (Completely Separated Conversation Threads) */}
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase shrink-0">Patient Thread:</span>
              {patients.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    handleOpenChat(p);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedPatient.id === p.id
                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Quick Clinical Guidance Templates */}
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
              <span className="text-[10px] text-blue-800 font-mono font-bold shrink-0">Quick Advice:</span>
              <button
                onClick={() => handleSendTherapistMessage('Great work! Please continue the 15 repetition set.')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 whitespace-nowrap font-medium cursor-pointer"
              >
                Continue 15 Reps
              </button>
              <button
                onClick={() => handleSendTherapistMessage('Make sure you fully stretch your fingers.')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 whitespace-nowrap font-medium cursor-pointer"
              >
                Stretch Fingers Fully
              </button>
              <button
                onClick={() => handleSendTherapistMessage('Take a 5 minute rest if you feel fatigued.')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 whitespace-nowrap font-medium cursor-pointer"
              >
                Take 5-Min Rest
              </button>
            </div>

            {/* Message History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-slate-50/50">
              {chatLoading ? (
                <div className="text-center py-10 text-slate-500 font-mono">Loading patient conversation...</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="font-semibold text-slate-700">No prior messages with {selectedPatient.name}.</p>
                  <p className="text-[11px] mt-1">Send a clinical prescription instruction or check-in note below.</p>
                </div>
              ) : (
                chatMessages.map(m => {
                  const isTherapist = m.sender_id === 'u_therapist_1' || m.sender_name?.includes('Dr. Rajesh');
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isTherapist ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-600 mb-1 font-mono font-bold">
                        {isTherapist ? 'Dr. Rajesh Kulkarni (You)' : selectedPatient.name}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                          isTherapist
                            ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/10'
                            : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                        }`}
                      >
                        {!isTherapist ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {m.translated_text || m.message_text}
                            </div>
                            {m.translated_text && m.translated_text !== m.message_text && (
                              <div className="text-[10px] text-blue-700 mt-1 italic border-t border-slate-100 pt-1 font-medium">
                                Original ({m.original_language?.toUpperCase() || 'Regional'}): "{m.message_text}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div>{m.message_text}</div>
                            {m.translated_text && m.translated_text !== m.message_text && (
                              <div className="text-[10px] text-blue-100 mt-1 italic border-t border-blue-500/40 pt-1">
                                Delivered to patient translated: "{m.translated_text}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Voice-to-Text */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isRecordingVoice
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse ring-2 ring-rose-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
                title={isRecordingVoice ? 'Listening... click to stop' : 'Record clinical note via voice'}
              >
                {isRecordingVoice ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-700" />}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTherapistMessage()}
                placeholder={isRecordingVoice ? `Listening... speak in English for ${selectedPatient.name}...` : `Type clinical response in English for ${selectedPatient.name}...`}
                className="flex-1 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-sans"
              />
              <button
                onClick={() => handleSendTherapistMessage()}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Priority Incoming Video Meeting Modal */}
      {incomingCall && !selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white text-center animate-slideDown">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-2 border-blue-400">
                <Video className="w-9 h-9" />
              </div>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-800 text-[11px] font-mono text-blue-300 mb-2 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Incoming Patient Video Meeting</span>
            </div>

            <h3 className="text-xl font-bold text-white font-display">
              {incomingCall.callerName || 'Asha Sharma (Patient)'}
            </h3>
            <p className="text-xs text-blue-300 font-mono mt-1">
              {incomingCall.meetingTitle || 'Clinical Telehealth Review & Video Meeting'}
            </p>
            <p className="text-[11px] text-slate-300 mt-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 font-medium">
              Your patient Asha Sharma has initiated an instant video meeting. Connect now to begin clinical motor review.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setSelectedMeeting(incomingCall.meeting || {
                    title: incomingCall.meetingTitle || 'Clinical Telehealth Video Meeting',
                    scheduled_time: 'Now (Immediate Telehealth)',
                    room_id: incomingCall.roomId || 'remotion-room-pt_1',
                    patient_id: 'pt_1',
                    patient_name: incomingCall.callerName || 'Asha Sharma'
                  });
                  setIncomingCall(null);
                }}
                className="w-full sm:flex-1 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
              >
                <Video className="w-5 h-5" />
                <span>Accept & Join Video Meeting</span>
              </button>
              <button
                onClick={() => setIncomingCall(null)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <PhoneOff className="w-4 h-4 text-rose-400" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Video Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-slideUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Schedule Video Meeting</h3>
                  <p className="text-xs text-slate-500 font-mono">Telehealth Session with Dual-Start Synchronization</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                  Assigned Patient
                </label>
                <select
                  value={scheduleForm.patient_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, patient_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.condition}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                  Consultation Title / Clinical Objective
                </label>
                <input
                  type="text"
                  required
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="e.g. Weekly Kinematics Evaluation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    placeholder="e.g. 04:30 PM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                  Consultation Duration
                </label>
                <select
                  value={scheduleForm.duration_minutes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, duration_minutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value={15}>15 Minutes (Rapid Telemetry Check)</option>
                  <option value={30}>30 Minutes (Standard Clinical Review)</option>
                  <option value={45}>45 Minutes (Full Motor Kinematics Assessment)</option>
                  <option value={60}>60 Minutes (Comprehensive Rehabilitation Exam)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
                  Clinical Focus & Notes
                </label>
                <textarea
                  rows={3}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Specific movements or tests to evaluate during video meeting..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Confirm & Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Meeting Modal */}
      {selectedMeeting && (
        <VideoMeetingModal
          isOpen={true}
          onClose={() => setSelectedMeeting(null)}
          meeting={selectedMeeting}
          currentUser={currentUser}
        />
      )}

      {/* Playable 3D Sports Engine Modal */}
      {selectedGame && (
        <PlayableGameModal
          game={selectedGame}
          isOpen={true}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* Remo Assistant in Therapist Mode */}
      <RemoAssistant
        userRole="therapist"
        initialLanguage="en"
      />
    </div>
  );
}
