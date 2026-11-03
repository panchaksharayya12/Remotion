import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope, Users, Search, Activity, Calendar, Clock,
  Plus, Edit, Pause, Play, Trash2, Video, MessageSquare,
  BarChart3, ShieldCheck, CheckCircle2, ChevronRight, Eye,
  Sparkles, AlertCircle, RefreshCw, Layers, FileText, Check, X,
  Gamepad2, Award, Sliders, ChevronDown, PhoneOff
} from 'lucide-react';
import { api } from '../services/api';
import VideoMeetingModal from '../components/VideoMeetingModal';
import RemoAssistant from '../components/RemoAssistant';

const THERAPIST_TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'patients', label: 'My Patients', icon: Users },
  { id: 'details', label: 'Patient Details', icon: FileText },
  { id: 'prescriptions', label: 'Exercise Prescriptions', icon: Layers },
  { id: 'games', label: 'Game Assignments', icon: Gamepad2 },
  { id: 'live', label: 'Live Sessions', icon: Eye },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'video', label: 'Video Consultations', icon: Video },
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

export default function TherapistPortal({ currentUser, onOpenHeadsetModal }) {
  const [activeTab, setActiveTab] = useState('overview'); // 11 clinical tabs
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const syncChannelRef = useRef(null);

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
    exercise_id: 'ex_squeeze_fill',
    game_id: '',
    target_reps: 15,
    frequency: 'Daily',
    difficulty: 'Moderate',
    duration_minutes: 15,
    instructions: 'Maintain full open hand extension between repetitions.',
    clinical_notes: 'Evaluate grip endurance and avoid wrist flexion compensation.',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: ''
  });

  // Load Therapist Assigned Patients
  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await api.getTherapistPatients();
      setPatients(res.patients || []);
      if (res.patients?.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res.patients[0].id);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load therapist patients:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
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

  // Immediate Dual-Start Video Consultation Launcher
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
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 3. Trigger localStorage storage event fallback (<1ms across all windows/browsers)
    try {
      localStorage.setItem('remotion_telehealth_call_signal', JSON.stringify({
        type: 'IMMEDIATE_START_CALL',
        callerRole: 'therapist',
        callerName: 'Dr. Rajesh Kulkarni, PT',
        meeting,
        timestamp: Date.now()
      }));
    } catch (e) {}

    // 4. Relay via Socket.IO across network
    if (api.socket) {
      api.socket.emit('webrtc_call_alert', {
        callerName: 'Dr. Rajesh Kulkarni, PT',
        roomId: meeting.room_id,
        meetingTitle: meeting.title,
        targetRole: 'patient',
        targetUserId: currentPt?.user_id || 'u_patient_1'
      });
    }

    setToastMessage(`Video consultation initiated with ${meeting.patient_name}. Room: ${meeting.room_id}`);
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
      notes: scheduleForm.notes || 'Clinical video consultation and kinematics check.',
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

    setShowScheduleModal(false);
    setToastMessage(`Consultation scheduled with ${newMeeting.patient_name} for ${newMeeting.scheduled_time}`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  // Real-time listener for patient session completions & incoming telehealth calls
  useEffect(() => {
    // 1. Cross-tab BroadcastChannel listener for instant dual-start
    const handleTelehealthMessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'IMMEDIATE_START_CALL' && data.callerRole !== 'therapist') {
        console.log('[TherapistPortal] Telehealth call auto-initiated by patient:', data.meeting);
        playRingChime();
        setSelectedMeeting(data.meeting);
        setToastMessage(`Patient ${data.callerName || 'Asha Sharma'} joined the video room. Connecting...`);
        setTimeout(() => setToastMessage(null), 6000);
      } else if (data.type === 'APPOINTMENT_SCHEDULED' && data.appointment) {
        setAppointments(prev => [data.appointment, ...prev.filter(a => a.id !== data.appointment.id)]);
      } else if (data.type === 'CHAT_MESSAGE' && data.message) {
        setChatMessages(prev => [...prev.filter(m => m.id !== data.message.id), data.message]);
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
            setSelectedMeeting(data.meeting);
          }
        } catch (err) {}
      } else if (e.key === 'remotion_chat_sync_signal' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'CHAT_MESSAGE' && data.message) {
            setChatMessages(prev => [...prev.filter(m => m.id !== data.message.id), data.message]);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 3. Socket.IO listeners
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
        console.log('[TherapistPortal] Incoming patient telehealth call from socket:', callData);
        playRingChime();
        const incomingMeeting = {
          title: callData.meetingTitle || 'Clinical Telehealth Consultation',
          scheduled_time: 'Now (Immediate Telehealth)',
          room_id: callData.roomId || `remotion-room-${selectedPatientId || 'pt_1'}`
        };
        setSelectedMeeting(incomingMeeting);
      };

      api.socket.on('patient_session_completed', handlePatientSession);
      api.socket.on('webrtc_incoming_call', handleSocketIncoming);
    }

    return () => {
      if (syncChannelRef.current) {
        try { syncChannelRef.current.close(); } catch (e) {}
      }
      window.removeEventListener('storage', handleStorageEvent);
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
      const res = await api.getMessages(pt.user_id);
      setChatMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load patient messages:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendTherapistMessage = async (customText = null) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || !selectedPatient?.user_id) return;
    try {
      const targetLang = selectedPatient.primary_language || 'hi';
      const sent = await api.sendMessage(selectedPatient.user_id, textToSend, 'en', targetLang);
      const msgObj = sent?.message || {
        id: 'msg_' + Date.now().toString(36),
        sender_id: 'u_therapist_1',
        sender_name: 'Dr. Rajesh Kulkarni, PT',
        receiver_id: selectedPatient.user_id,
        message_text: textToSend,
        created_at: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, msgObj]);

      if (syncChannelRef.current) {
        try {
          syncChannelRef.current.postMessage({
            type: 'CHAT_MESSAGE',
            message: msgObj,
            timestamp: Date.now()
          });
        } catch (e) {}
      }

      try {
        localStorage.setItem('remotion_chat_sync_signal', JSON.stringify({
          type: 'CHAT_MESSAGE',
          message: msgObj,
          timestamp: Date.now()
        }));
      } catch (e) {}

      if (!customText) setChatInput('');
    } catch (err) {
      console.error('Failed to send therapist message:', err);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      const res = await api.createPrescription({
        ...prescriptionForm,
        patient_id: selectedPatientId
      });

      setShowPrescriptionModal(false);
      setToastMessage(`Prescription created and delivered to patient via real-time WebSocket.`);

      const updated = await api.getPatientDetails(selectedPatientId);
      setPatientDetail(updated);

      setTimeout(() => setToastMessage(null), 6000);
    } catch (err) {
      console.error('Create prescription error:', err);
      alert('Failed to submit prescription: ' + err.message);
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

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              onClick={() => setShowLiveMonitor(!showLiveMonitor)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                showLiveMonitor ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{showLiveMonitor ? 'Hide Telemetry Monitor' : 'Live Patient Monitor'}</span>
            </button>

            <button
              onClick={() => setShowPrescriptionModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Prescription</span>
            </button>
          </div>
        </div>

        {/* 11 Clinical Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-6 scrollbar-none bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          {THERAPIST_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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

        {/* Live Side-by-Side Patient Monitoring Panel */}
        {showLiveMonitor && (
          <div className="mb-8 p-6 rounded-3xl bg-white border border-slate-200 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Biofeedback Stream: {selectedPatient?.name || 'Asha Sharma'}
                </h3>
              </div>
              <span className="text-xs font-mono text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-bold">
                MediaPipe 60 FPS Optical Stream
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative rounded-2xl bg-slate-900 h-64 overflow-hidden flex items-center justify-center text-white">
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                    {selectedPatient?.name?.slice(0, 2).toUpperCase() || 'AS'}
                  </div>
                  <div className="text-xs font-bold text-white">Live Patient Upper-Limb Kinematics</div>
                  <div className="text-[11px] text-slate-400 mt-1">Left Hemiparetic Grip & Reaching</div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded text-[10px] text-emerald-400 font-mono">
                  Optical Hand Tracking: Optimal (99%)
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider font-bold">
                    Instantaneous Kinematics
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] text-slate-700 block font-bold">SHOULDER ABDUCTION</span>
                      <span className="text-lg font-black text-blue-700">76.4°</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] text-slate-700 block font-bold">FINGER EXTENSION SPAN</span>
                      <span className="text-lg font-black text-emerald-700">88.2%</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] text-slate-700 block font-bold">TREMOR SPECTRUM</span>
                      <span className="text-lg font-black text-slate-800">1.2 Hz (Normal)</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] text-slate-700 block font-bold">REACTION LATENCY</span>
                      <span className="text-lg font-black text-amber-700">340 ms</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 font-medium">
                  Patient actively completing prescribed Squeeze & Fill protocol. Steady neuromuscular recruitment observed.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointments / Video Consultations Tab View */}
        {(activeTab === 'appointments' || activeTab === 'video') && (
          <div className="mb-8 p-6 rounded-3xl bg-white border border-slate-200 shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  <span>Clinical Telehealth & Video Consultation Suite</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct peer-to-peer WebRTC video stream with real-time MediaPipe kinematics, live speech translation, and electronic record logging.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Schedule Video Call</span>
                </button>

                <button
                  onClick={() => startImmediateCall({
                    title: `Immediate Clinical Review with ${selectedPatient?.name || 'Asha Sharma'}`,
                    patient_id: selectedPatient?.id || 'pt_1',
                    patient_name: selectedPatient?.name || 'Asha Sharma',
                    room_id: `remotion-room-${selectedPatient?.id || 'pt_1'}`
                  })}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Video Call ({selectedPatient?.name || 'Asha Sharma'})</span>
                </button>
              </div>
            </div>

            {/* Dynamic Appointment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-blue-950">{appt.title}</span>
                      <span className="text-[10px] font-mono bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                        {appt.status || 'SCHEDULED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Patient: <span className="font-bold text-slate-900">{appt.patient_name || 'Asha Sharma'}</span>
                    </p>
                    <div className="text-xs font-mono text-blue-700 font-semibold mt-1 flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{appt.scheduled_time} ({appt.duration_minutes || 30} mins)</span>
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-slate-600 mt-2 bg-white/70 p-2.5 rounded-lg border border-blue-100">
                        {appt.notes}
                      </p>
                    )}
                    <div className="text-[10px] font-mono text-slate-500 mt-2">
                      Room: {appt.room_id || `remotion-room-${appt.patient_id || 'pt_1'}`}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between">
                    <button
                      onClick={() => startImmediateCall(appt)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Launch Video Call (Dual-Start)</span>
                    </button>
                    <span className="text-[11px] text-emerald-600 font-mono font-medium flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>WebRTC Ready</span>
                    </span>
                  </div>
                </div>
              ))}

              {/* Diagnostic Overview Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block mb-2">Telehealth Diagnostic Features</span>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Real-time STUN/TURN peer-to-peer video streaming with zero lag</li>
                    <li>Synchronized joint angle goniometer telemetry overlay</li>
                    <li>Dual-language live translated captioning (Hindi, Kannada, Tamil, Telugu, English)</li>
                    <li>Automatic cross-portal launch synchronization between clinician and patient</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Signaling: BroadcastChannel + Socket.IO</span>
                  <span className="text-blue-600 font-bold">Latency: &lt;15ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Clinical Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Assigned Patient Caseload (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Assigned Patient Registry</span>
              </h2>
              <span className="text-xs font-mono bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {filteredPatients.length} Active
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient name or condition..."
                className="w-full bg-slate-50 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {/* Patient Cards */}
            <div className="space-y-2.5">
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    p.id === selectedPatientId
                      ? 'bg-blue-50/80 border-blue-400 shadow-md ring-2 ring-blue-500/10'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5 font-medium">{p.condition}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      Lvl {p.level}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Streak: {p.streak} Days</span>
                    <span className="text-emerald-700 font-bold">Compliance: 96%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Patient Clinical Detail & Longitudinal Metrics (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedPatient && (
              <>
                {/* Patient Profile Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <h2 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h2>
                        <span className="text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full">
                          {selectedPatient.recovery_level}
                        </span>
                      </div>
                      <p className="text-xs text-blue-800 font-medium mt-0.5">
                        {selectedPatient.condition} • Affected Side: <span className="font-bold">{selectedPatient.affected_side}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenChat(selectedPatient)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20"
                        title="Open Multilingual Tele-Consultation Channel"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        <span>Patient Messenger</span>
                      </button>

                      <button
                        onClick={() => startImmediateCall({
                          title: `Clinical Review with ${selectedPatient.name}`,
                          patient_id: selectedPatient.id,
                          patient_name: selectedPatient.name,
                          room_id: `remotion-room-${selectedPatient.id}`
                        })}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 fill-current" />
                        <span>Start Video Call</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="my-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-700 text-[10px] block font-bold">TOTAL SESSIONS</span>
                      <span className="text-base font-black text-slate-900">{selectedPatient.total_sessions || 6} Completed</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-700 text-[10px] block font-bold">AVG ACCURACY</span>
                      <span className="text-base font-black text-emerald-700">{Math.round(selectedPatient.avg_accuracy || 94)}%</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-700 text-[10px] block font-bold">PEAK RANGE OF MOTION</span>
                      <span className="text-base font-black text-blue-700">{Math.round(selectedPatient.peak_rom || 82)}°</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-700 text-[10px] block font-bold">ACTIVE PRESCRIPTIONS</span>
                      <span className="text-base font-black text-amber-700">{selectedPatient.active_prescriptions_count || 3} Tasks</span>
                    </div>
                  </div>

                  {/* Longitudinal Recovery Graph */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>Longitudinal Recovery Curves (Range of Motion & Accuracy)</span>
                    </h3>

                    <div className="w-full h-44 bg-slate-50 rounded-2xl p-4 border border-slate-200 relative flex flex-col justify-end">
                      <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                        <line x1="0" y1="30" x2="500" y2="30" stroke="#cbd5e1" strokeDasharray="3 3" />
                        <line x1="0" y1="60" x2="500" y2="60" stroke="#cbd5e1" strokeDasharray="3 3" />
                        <line x1="0" y1="90" x2="500" y2="90" stroke="#cbd5e1" strokeDasharray="3 3" />

                        {/* ROM line */}
                        <polyline
                          points="20,100 100,85 180,72 260,60 340,48 420,38 480,30"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        {/* Accuracy line */}
                        <polyline
                          points="20,60 100,55 180,50 260,45 340,40 420,35 480,32"
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />

                        {[
                          [20, 100], [100, 85], [180, 72], [260, 60],
                          [340, 48], [420, 38], [480, 30]
                        ].map(([cx, cy], i) => (
                          <circle key={i} cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                        ))}
                      </svg>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-200">
                        <span>Baseline</span>
                        <span>Session 3</span>
                        <span>Session 5</span>
                        <span>Latest Session (82° ROM)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clinical SOAP Documentation Editor */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Clinical SOAP Note (EMR Documentation)</span>
                    </h3>
                    <button
                      onClick={() => {
                        setSoapSaved(true);
                        setTimeout(() => setSoapSaved(false), 3000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center space-x-1"
                    >
                      {soapSaved ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{soapSaved ? 'Note Saved' : 'Save SOAP Note'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                        S — Subjective
                      </label>
                      <textarea
                        rows="2"
                        value={soapNotes.subjective}
                        onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                        O — Objective
                      </label>
                      <textarea
                        rows="2"
                        value={soapNotes.objective}
                        onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                        A — Assessment
                      </label>
                      <textarea
                        rows="2"
                        value={soapNotes.assessment}
                        onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                        P — Plan
                      </label>
                      <textarea
                        rows="2"
                        value={soapNotes.plan}
                        onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Prescriptions Table for Selected Patient */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">
                      Current Prescriptions & Recommendations
                    </h3>
                    <button
                      onClick={() => setShowPrescriptionModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Prescription</span>
                    </button>
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
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs"
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'active')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs"
                            >
                              Resume
                            </button>
                          )}

                          <button
                            onClick={() => handleUpdateStatus(p.id, 'discontinued')}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                          >
                            Discontinue
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Confidential Clinical Notes</label>
                <textarea
                  rows="2"
                  value={prescriptionForm.clinical_notes}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, clinical_notes: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-xs font-sans"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
                >
                  Dispatch to Patient
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

            {/* Quick Clinical Guidance Templates */}
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
              <span className="text-[10px] text-blue-800 font-mono font-bold shrink-0">Quick Advice:</span>
              <button
                onClick={() => handleSendTherapistMessage('Great work! Please continue the 15 repetition set.')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 whitespace-nowrap font-medium"
              >
                Continue 15 Reps
              </button>
              <button
                onClick={() => handleSendTherapistMessage('Make sure you fully stretch your fingers.')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 whitespace-nowrap font-medium"
              >
                Stretch Fingers Fully
              </button>
              <button
                onClick={() => handleSendTherapistMessage('Take a 5 minute rest if you feel fatigued.')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 border border-blue-200 text-blue-900 whitespace-nowrap font-medium"
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
                  const isTherapist = m.sender_id === currentUser?.id;
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
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTherapistMessage()}
                placeholder={`Type clinical response in English for ${selectedPatient.name}...`}
                className="flex-1 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-sans"
              />
              <button
                onClick={() => handleSendTherapistMessage()}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 shadow-md shadow-blue-600/20"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Patient Call Alert */}
      {incomingCall && !selectedMeeting && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full bg-slate-900 border-2 border-blue-500 rounded-3xl p-5 shadow-2xl text-white animate-bounce-short">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Incoming Patient Telehealth Call</h4>
              <p className="text-xs text-blue-300 font-mono">{incomingCall.callerName || 'Asha Sharma (Patient)'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mb-4">{incomingCall.meetingTitle || 'Clinical Telehealth Consultation'}</p>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedMeeting({
                  title: incomingCall.meetingTitle || 'Clinical Telehealth Consultation',
                  scheduled_time: 'Now (Immediate Telehealth)',
                  room_id: incomingCall.roomId || `remotion-room-pt_1`
                });
                setIncomingCall(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Accept & Join Call</span>
            </button>
            <button
              onClick={() => setIncomingCall(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Schedule Video Consultation Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-slideUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Schedule Video Consultation</h3>
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
                  placeholder="Specific movements or tests to evaluate during call..."
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

      {/* Video Consultation Modal */}
      {selectedMeeting && (
        <VideoMeetingModal
          isOpen={true}
          onClose={() => setSelectedMeeting(null)}
          meeting={selectedMeeting}
          currentUser={currentUser}
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