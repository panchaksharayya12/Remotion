import React, { useState, useEffect, useRef } from 'react';
import {
  User, Award, Zap, Activity, Calendar, Clock, CheckCircle2,
  Play, MessageSquare, Video, Bell, ChevronRight, Sparkles,
  Layers, Shield, ArrowUpRight, Flame, BarChart3, RefreshCw,
  Mic, MicOff, Volume2, Globe, Scan, X, HeartPulse, Check,
  Gamepad2, Dumbbell, History, Stethoscope, ChevronLeft, AlertCircle,
  Send, Loader2, PhoneOff
} from 'lucide-react';
import { api } from '../services/api';
import SqueezeFillCanvas from '../exercises/SqueezeFillCanvas';
import ReachTouch3D from '../exercises/ReachTouch3D';
import HandFunctionCheck from '../exercises/HandFunctionCheck';
import HandBodyAnalyzer from '../components/HandBodyAnalyzer';
import VideoMeetingModal from '../components/VideoMeetingModal';
import RemoAssistant from '../components/RemoAssistant';
import PlayableGameModal from './PlayableGameModal';
import GameThumbnail from '../components/GameThumbnail';

export default function PatientPortal({ currentUser, onNavigateGaming }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, exercises, games, chat, progress, appointments, history, assistant, profile
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeExercise, setActiveExercise] = useState(null); // 'squeeze_fill', 'reach_touch', 'hand_check', 'hand_analyzer', null
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLanguage, setChatLanguage] = useState('hi');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [realtimeNotice, setRealtimeNotice] = useState(null);
  const [isGuidedRoutineActive, setIsGuidedRoutineActive] = useState(false);
  const [guidedStep, setGuidedStep] = useState(0);

  // Fetch initial patient data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getPatientDashboard();
      setDashboardData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching patient dashboard:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Load chat messages with therapist
  const loadChat = async () => {
    const therapistId = dashboardData?.therapist?.user_id || 'u_therapist_1';
    try {
      const res = await api.getMessages(therapistId);
      setChatMessages(res.messages || []);
    } catch (err) {
      console.warn('Failed to load chat:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      loadChat();
    }
  }, [activeTab, dashboardData?.therapist?.user_id]);

  // Send message to therapist
  const handleSendChatMessage = async (textOverride = null) => {
    const text = textOverride || chatInput;
    if (!text.trim()) return;

    const therapistId = dashboardData?.therapist?.user_id || 'u_therapist_1';
    setIsSendingChat(true);

    try {
      const res = await api.sendMessage(therapistId, text.trim(), chatLanguage, 'en');
      if (res.message) {
        setChatMessages(prev => [...prev, res.message]);
      }
      if (!textOverride) setChatInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Synthesize audible clinical incoming call ring tone
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

  // Socket.IO Real-Time Listener for Instant Prescription Updates & Messages
  useEffect(() => {
    if (!api.socket) return;

    const handlePrescriptionCreated = (newPrescription) => {
      setRealtimeNotice(`New prescription assigned: ${newPrescription.exercise_name || newPrescription.game_title || 'Routine'}`);
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          prescriptions: [newPrescription, ...(prev.prescriptions || [])]
        };
      });
      setTimeout(() => setRealtimeNotice(null), 7000);
    };

    const handlePrescriptionUpdated = (updatedPrescription) => {
      setRealtimeNotice(`Prescription updated by therapist.`);
      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          prescriptions: prev.prescriptions.map(p => p.id === updatedPrescription.id ? updatedPrescription : p)
        };
      });
      setTimeout(() => setRealtimeNotice(null), 5000);
    };

    const handleNotification = (notif) => {
      setRealtimeNotice(`${notif.title}: ${notif.message}`);
      setTimeout(() => setRealtimeNotice(null), 6000);
    };

    const handleNewMessage = (msg) => {
      setChatMessages(prev => [...prev, msg]);
      setRealtimeNotice(`Message from ${msg.sender_name || 'Dr. Rajesh'}: ${msg.message_text}`);
      setTimeout(() => setRealtimeNotice(null), 6000);
    };

    const handleIncomingCall = (callData) => {
      console.log('[PatientPortal] Telehealth incoming call:', callData);
      setIncomingCall(callData);
      playRingChime();
    };

    api.socket.on('prescription_created', handlePrescriptionCreated);
    api.socket.on('prescription_updated', handlePrescriptionUpdated);
    api.socket.on('notification', handleNotification);
    api.socket.on('new_message', handleNewMessage);
    api.socket.on('webrtc_incoming_call', handleIncomingCall);

    return () => {
      api.socket.off('prescription_created', handlePrescriptionCreated);
      api.socket.off('prescription_updated', handlePrescriptionUpdated);
      api.socket.off('notification', handleNotification);
      api.socket.off('new_message', handleNewMessage);
      api.socket.off('webrtc_incoming_call', handleIncomingCall);
    };
  }, []);

  // Time of day friendly greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-600 font-semibold">
            Loading Recovery Dashboard...
          </span>
        </div>
      </div>
    );
  }

  const patient = dashboardData?.patient || {};
  const stats = dashboardData?.stats || {};
  const prescriptions = dashboardData?.prescriptions || [];
  const recentSessions = dashboardData?.recent_sessions || [];
  const therapist = dashboardData?.therapist || {};
  const meetings = dashboardData?.meetings || [];
  const weeklyAdherence = dashboardData?.weekly_adherence || [];

  // Filter only games assigned or prescribed by therapist
  const assignedGames = [
    { id: 'gm_badminton', title: 'Badminton Overhead Rally', cat: 'Speed & Agility', desc: 'Overhead racquet reaching and shuttlecock returns prescribed for shoulder abduction.', reps: 10 },
    { id: 'gm_cricket', title: 'Cricket Batting Timing', cat: 'Sports Simulation', desc: 'Forward drive stroke timing with English willow bat for elbow extension.', reps: 12 },
    { id: 'gm_balloon_pop', title: 'Balloon Pop Warm-up', cat: 'Range & Speed', desc: 'Ascending colorful balloons testing multi-quadrant reaching.', reps: 15 }
  ];

  // Start Guided Session (Only patient's assigned exercises & games in order)
  const handleStartTodaySession = () => {
    setIsGuidedRoutineActive(true);
    setGuidedStep(0);
    setActiveExercise('squeeze_fill');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-24 selection:bg-teal-500/20 selection:text-teal-900">
      {/* Real-time Push Alert Banner */}
      {realtimeNotice && (
        <div className="sticky top-16 z-30 bg-teal-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between animate-fadeIn text-xs font-medium">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{realtimeNotice}</span>
          </div>
          <button onClick={() => setRealtimeNotice(null)} className="p-1 hover:bg-teal-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Patient Sub-Navigation Bar (Focused on recovery, NO admin or unrestricted catalogs) */}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none">
            {[
              { id: 'dashboard', label: 'My Dashboard', icon: Activity },
              { id: 'exercises', label: 'Prescribed Exercises', icon: Dumbbell },
              { id: 'games', label: 'Assigned Games', icon: Gamepad2 },
              { id: 'chat', label: 'Clinician Chat', icon: MessageSquare },
              { id: 'progress', label: 'Recovery Progress', icon: BarChart3 },
              { id: 'appointments', label: 'Appointments', icon: Calendar },
              { id: 'history', label: 'Session History', icon: History },
              { id: 'assistant', label: 'Remo Assistant', icon: Sparkles },
              { id: 'profile', label: 'My Profile', icon: User }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">

        {/* ======================================================== */}
        {/* TAB 1: MY DASHBOARD                                      */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">

            {/* Friendly Greeting & Start Today's Session Banner */}
            <div className="relative rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white p-6 sm:p-8 shadow-xl overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-teal-100 text-xs font-mono mb-3">
                    <HeartPulse className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Personalized Rehabilitation Routine</span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                    {getGreeting()}, {patient.name || currentUser?.name || 'Asha'}!
                  </h1>
                  <p className="mt-2 text-teal-50 text-xs sm:text-sm max-w-xl leading-relaxed">
                    Welcome to your daily motor rehabilitation routine. Your exercises feature continuous partial movement scoring calibrated for your range of motion.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-center sm:items-end">
                  <button
                    onClick={handleStartTodaySession}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-teal-800 hover:bg-teal-50 font-bold text-sm sm:text-base shadow-2xl shadow-teal-950/40 hover:scale-105 transition-all flex items-center justify-center space-x-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                    <span className="tracking-wide">Start Today's Session</span>
                  </button>
                  <span className="text-[11px] font-mono text-teal-200 mt-2">
                    {prescriptions.length || 3} exercises • ~15 mins total
                  </span>
                </div>
              </div>

              {/* XP, Streak, Completed Sets Bar */}
              <div className="mt-6 pt-6 border-t border-teal-500/40 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="text-[11px] font-mono text-teal-100 uppercase tracking-wider flex items-center justify-between">
                    <span>Recovery XP</span>
                    <Zap className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="text-2xl font-black font-mono mt-1 text-white">
                    {patient.xp || 480} <span className="text-xs text-teal-200 font-normal">XP</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="text-[11px] font-mono text-teal-100 uppercase tracking-wider flex items-center justify-between">
                    <span>Daily Streak</span>
                    <Flame className="w-4 h-4 text-rose-300" />
                  </div>
                  <div className="text-2xl font-black font-mono mt-1 text-white">
                    {patient.streak || 7} <span className="text-xs text-teal-200 font-normal">Days Active</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="text-[11px] font-mono text-teal-100 uppercase tracking-wider flex items-center justify-between">
                    <span>Completed Sets</span>
                    <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  </div>
                  <div className="text-2xl font-black font-mono mt-1 text-white">
                    {stats.total_sessions || 6} <span className="text-xs text-teal-200 font-normal">Sessions</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="text-[11px] font-mono text-teal-100 uppercase tracking-wider flex items-center justify-between">
                    <span>Avg Accuracy</span>
                    <Award className="w-4 h-4 text-cyan-200" />
                  </div>
                  <div className="text-2xl font-black font-mono mt-1 text-emerald-200">
                    {stats.avg_accuracy || 94}%
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptions & Instructions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <span>Today's Rehabilitation Plan</span>
                      <span className="text-xs font-mono bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full font-bold">
                        {prescriptions.length} Prescribed Tasks
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sequential motor exercises assigned by Dr. Rajesh Kulkarni
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('exercises')}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {prescriptions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-mono text-xs">
                      No prescriptions active for today. Your clinician will assign your next routine shortly.
                    </div>
                  ) : (
                    prescriptions.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-teal-300 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                                {p.exercise_name || p.game_title || 'Rehabilitation Routine'}
                              </h4>
                              <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                                {p.difficulty || 'Moderate'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {p.instructions || 'Execute controlled repetitions focusing on full joint extension.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs font-bold font-mono text-slate-700 block">
                              {p.target_reps || 15} Reps
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.frequency || 'Daily'}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              if (p.exercise_id === 'ex_squeeze_fill' || p.exercise_name?.includes('Squeeze')) setActiveExercise('squeeze_fill');
                              else if (p.exercise_id === 'ex_reach_touch' || p.exercise_name?.includes('Reach')) setActiveExercise('reach_touch');
                              else if (p.game_id) setSelectedGame({ id: p.game_id, title: p.game_title || 'Game', category: 'Prescribed' });
                              else setActiveExercise('squeeze_fill');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm flex items-center space-x-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Assigned Clinician Card with Direct Chat Link */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      <span>Assigned Clinician</span>
                    </h3>
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      Supervisor
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                      {therapist.name ? therapist.name.split(' ').map(n=>n[0]).join('').substring(0,2) : 'RK'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {therapist.name || 'Dr. Rajesh Kulkarni, PT'}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        {therapist.specialization || 'Lead Neuro-Rehabilitation'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">NEXT APPOINTMENT:</div>
                    <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Tomorrow, 10:30 AM (Tele-Consult)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message Dr. Rajesh</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-slate-400" />
                    <span>Appointments</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recovery Progress Metrics & Weekly Adherence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <span>Recovery Progress</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    +14° vs Baseline
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-mono mb-1">
                      <span className="text-slate-500">Active Extension ROM</span>
                      <span className="font-bold text-slate-800">{stats.peak_rom || 82}° / 90° Goal</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, ((stats.peak_rom || 82) / 90) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-mono mb-1">
                      <span className="text-slate-500">Motor Trajectory Accuracy</span>
                      <span className="font-bold text-slate-800">{stats.avg_accuracy || 94}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                        style={{ width: `${stats.avg_accuracy || 94}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 7-Day Adherence Week Grid */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>Weekly Activity</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-teal-600">
                    7/7 Days Done
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const isDone = i < 6;
                    const isToday = i === 6;
                    return (
                      <div key={day} className="flex flex-col items-center">
                        <span className="text-[10px] font-mono text-slate-400 mb-1.5">{day}</span>
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                            isDone
                              ? 'bg-teal-600 text-white shadow-sm'
                              : isToday
                              ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 font-black'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : (i + 1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MY EXERCISES                                      */}
        {/* ======================================================== */}
        {activeTab === 'exercises' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Prescribed Rehabilitation Exercises</h2>
              <p className="text-xs text-slate-500 mt-1">
                Clinical biomechanical routines with real-time biofeedback and continuous partial movement scoring.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Exercise 1: Squeeze & Fill */}
              <div className="bg-white rounded-3xl p-6 border-2 border-teal-100 hover:border-teal-400 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase bg-teal-50 text-teal-700 font-bold px-2.5 py-1 rounded-lg border border-teal-200">
                      Continuous Grasp
                    </span>
                    <span className="text-xs font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      15 Reps
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Squeeze & Fill</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Squeeze a virtual sponge using webcam or spacebar. Features continuous partial movement scoring ($0.0 \to 1.0$) and progressive beaker volume accumulation.
                  </p>
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                    Adaptive Comfort Range • Partial Reps Credited
                  </div>
                </div>

                <button
                  onClick={() => setActiveExercise('squeeze_fill')}
                  className="mt-6 w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Squeeze & Fill</span>
                </button>
              </div>

              {/* Exercise 2: Reach & Touch 3D */}
              <div className="bg-white rounded-3xl p-6 border-2 border-cyan-100 hover:border-cyan-400 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase bg-cyan-50 text-cyan-700 font-bold px-2.5 py-1 rounded-lg border border-cyan-200">
                      Spatial Coordination
                    </span>
                    <span className="text-xs font-bold font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                      20 Reps
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Reach & Touch 3D</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Interactive 3D spatial target contact testing reach trajectory, latency, and multi-quadrant upper limb flexion without compensatory posture.
                  </p>
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                    Three.js WebGL Engine • Spatial Depth Targets
                  </div>
                </div>

                <button
                  onClick={() => setActiveExercise('reach_touch')}
                  className="mt-6 w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Reach & Touch</span>
                </button>
              </div>

              {/* Exercise 3: Hand Function Check */}
              <div className="bg-white rounded-3xl p-6 border-2 border-blue-100 hover:border-blue-400 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                      Clinical Assessment
                    </span>
                    <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      4 Protocols
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Hand Function Check</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Structured 4-task assessment tracking maximum finger extension, clench speed, pinch opposition, and tap cadence for clinical progress reporting.
                  </p>
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                    Dexterity Index • Goniometric Angle Measurement
                  </div>
                </div>

                <button
                  onClick={() => setActiveExercise('hand_check')}
                  className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Assessment</span>
                </button>
              </div>

              {/* Exercise 4: Markerless AR Hand Bone Detector */}
              <div className="bg-white rounded-3xl p-6 border-2 border-indigo-100 hover:border-indigo-400 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg border border-indigo-200">
                      Computer Vision
                    </span>
                    <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      21 Landmarks
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Markerless AR Hand Bone Detector</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Optical markerless augmented reality tracker detecting 19 hand bones and 21 articulations with live protractor joint angles and goniometric flexion analysis.
                  </p>
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                    Markerless AR Passthrough • 19 Bones / 21 Joints Locked
                  </div>
                </div>

                <button
                  onClick={() => setActiveExercise('hand_analyzer')}
                  className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Scan className="w-4 h-4" />
                  <span>Launch Bone Detector</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ASSIGNED GAMES (ONLY Prescribed Games)             */}
        {/* ======================================================== */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Assigned Rehabilitation Games</h2>
              <p className="text-xs text-slate-500 mt-1">
                3D sports simulations prescribed by your physical therapist for motor coordination and active range of motion.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedGames.map(game => (
                <div
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-teal-400 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="h-40 rounded-2xl bg-slate-900 mb-4 overflow-hidden relative">
                      <GameThumbnail gameId={game.id} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute top-3 right-3 bg-slate-950/80 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-cyan-300 font-bold border border-cyan-800">
                        {game.reps} Target Reps
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-teal-600 font-bold uppercase">{game.cat}</span>
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors mt-1">{game.title}</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{game.desc}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600">
                    <span>Start 3D Session</span>
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CLINICIAN CHAT (Patient to Therapist)             */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh] animate-fadeIn">
            {/* Chat Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  RK
                </div>
                <div>
                  <h3 className="font-bold text-sm">Dr. Rajesh Kulkarni, PT</h3>
                  <div className="flex items-center space-x-1.5 text-xs text-teal-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Assigned Supervisor • Online</span>
                  </div>
                </div>
              </div>

              {/* Language Selection */}
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-teal-400" />
                <select
                  value={chatLanguage}
                  onChange={(e) => setChatLanguage(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-mono rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>
            </div>

            {/* Chat Message Scrollable Feed */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-mono text-xs">
                  No previous messages. Send your first update to Dr. Rajesh below!
                </div>
              ) : (
                chatMessages.map((msg, i) => {
                  const isPatient = msg.sender_id === (currentUser?.id || 'u_patient_1');
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md p-4 rounded-2xl shadow-sm text-xs leading-relaxed ${
                          isPatient
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                        }`}
                      >
                        <div className="font-medium">{msg.message_text}</div>

                        {/* Translated text if available */}
                        {msg.translated_text && msg.translated_text !== msg.message_text && (
                          <div className={`mt-2 pt-2 border-t text-[11px] font-mono ${
                            isPatient ? 'border-teal-500/50 text-teal-100' : 'border-slate-100 text-slate-500'
                          }`}>
                            <span className="text-[9px] uppercase tracking-wider block opacity-75">Translation:</span>
                            {msg.translated_text}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                        {isPatient ? 'You' : 'Dr. Rajesh'} • {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Response Chips */}
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center space-x-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono text-slate-400 shrink-0">Quick Update:</span>
              {[
                'Completed today\'s Squeeze & Fill sets!',
                'Feeling less fatigue during reaching.',
                'Can we review my extension range tomorrow?',
                'Ready for next week\'s exercise progression.'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(chip)}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[11px] whitespace-nowrap transition-colors border border-slate-200 shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Type a clinical update or question for Dr. Rajesh..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={isSendingChat || !chatInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: MY PROGRESS                                       */}
        {/* ======================================================== */}
        {activeTab === 'progress' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">My Recovery Progress & Milestones</h2>
              <p className="text-xs text-slate-500 mt-1">Biomechanical metrics tracked over consecutive therapy sessions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-xs font-mono text-slate-500 uppercase">CURRENT STAGE</span>
                <div className="text-3xl font-black text-teal-700 font-display mt-2">{patient.recovery_level || 'Stage 4'}</div>
                <p className="text-xs text-slate-500 mt-2">Active Upper Limb Motor Recovery</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-xs font-mono text-slate-500 uppercase">PEAK ROM EXTENSION</span>
                <div className="text-3xl font-black text-emerald-600 font-mono mt-2">{stats.peak_rom || 82}°</div>
                <p className="text-xs text-slate-500 mt-2">+14° improvement from baseline (68°)</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-xs font-mono text-slate-500 uppercase">TOTAL SESSIONS LOGGED</span>
                <div className="text-3xl font-black text-blue-600 font-mono mt-2">{stats.total_sessions || 6}</div>
                <p className="text-xs text-slate-500 mt-2">{stats.total_reps || 117} Total Motor Repetitions</p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: APPOINTMENTS                                      */}
        {/* ======================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Clinical Appointments & Telehealth</h2>
              <p className="text-xs text-slate-500 mt-1">Scheduled video consultations and check-ins with Dr. Rajesh Kulkarni.</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm divide-y divide-slate-100">
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <Video className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Weekly Kinematics Evaluation</h4>
                    <p className="text-xs text-slate-500">Dr. Rajesh Kulkarni, PT • 30 mins video session</p>
                    <div className="text-xs text-teal-700 font-mono mt-1">Tomorrow at 10:30 AM</div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMeeting({
                    title: 'Weekly Kinematics Evaluation with Dr. Rajesh Kulkarni',
                    scheduled_time: 'Now (Immediate Telehealth)',
                    room_id: `remotion-room-${patient?.id || 'pt_1'}`
                  })}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Video Call</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: SESSION HISTORY                                   */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Full Session History</h2>
              <p className="text-xs text-slate-500 mt-1">Every recorded exercise and game repetition saved to your database.</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Activity Name</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Repetitions</th>
                    <th className="py-3 px-4">Accuracy</th>
                    <th className="py-3 px-4">ROM Extension</th>
                    <th className="py-3 px-4">Clinical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSessions.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.exercise_name || s.game_title || 'Exercise'}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{new Date(s.start_time).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono">{Math.floor(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</td>
                      <td className="py-3 px-4 font-bold">{s.repetitions_completed} reps</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{Math.round(s.accuracy_pct)}%</td>
                      <td className="py-3 px-4 font-mono">{s.range_of_motion_deg ? `${Math.round(s.range_of_motion_deg)}°` : '—'}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{s.notes || 'Routine completed successfully.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: REMO ASSISTANT                                    */}
        {/* ======================================================== */}
        {activeTab === 'assistant' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm animate-fadeIn max-w-3xl mx-auto">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-teal-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">Remo Multilingual Assistant</h3>
                <p className="text-xs text-slate-500">Ask questions about your exercises in English, Hindi, Kannada, Tamil, or Telugu</p>
              </div>
            </div>

            <RemoAssistant
              isExerciseActive={false}
              userRole="patient"
              initialLanguage={patient.primary_language || 'hi'}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 9: MY PROFILE                                        */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm animate-fadeIn max-w-2xl mx-auto">
            <div className="flex items-center space-x-4 pb-6 border-b border-slate-100 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                {patient.name ? patient.name.split(' ').map(n=>n[0]).join('').substring(0,2) : 'AS'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{patient.name || 'Asha Sharma'}</h3>
                <p className="text-xs text-slate-500 font-mono">Patient ID: {patient.id || 'pt_1'}</p>
                <div className="mt-1 text-xs text-teal-700 font-semibold">{patient.condition || 'Post-Stroke Left Upper Limb Hemiparesis'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block uppercase">AFFECTED SIDE</span>
                <span className="font-bold text-slate-800 capitalize">{patient.affected_side || 'Left'} Arm</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block uppercase">RECOVERY STAGE</span>
                <span className="font-bold text-slate-800">{patient.recovery_level || 'Stage 4 Intermediate'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block uppercase">PRIMARY LANGUAGE</span>
                <span className="font-bold text-slate-800 uppercase">{patient.primary_language || 'Hindi (hi)'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block uppercase">EMERGENCY CONTACT</span>
                <span className="font-bold text-slate-800">{patient.emergency_contact || '+91 98450 99991'}</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Fullscreen Dedicated Exercise Theater Modal */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-5xl my-auto">
            {activeExercise === 'squeeze_fill' && (
              <SqueezeFillCanvas
                targetReps={15}
                patientName={patient.name || currentUser?.name || 'Asha'}
                autoStart={true}
                onCompleteSession={() => {
                  loadDashboard();
                  if (isGuidedRoutineActive) {
                    setGuidedStep(1);
                    setActiveExercise('reach_touch');
                  } else {
                    setActiveExercise(null);
                  }
                }}
                onExit={() => {
                  setActiveExercise(null);
                  setIsGuidedRoutineActive(false);
                }}
              />
            )}

            {activeExercise === 'reach_touch' && (
              <ReachTouch3D
                targetReps={20}
                onCompleteSession={() => {
                  loadDashboard();
                  if (isGuidedRoutineActive) {
                    setIsGuidedRoutineActive(false);
                    setActiveExercise(null);
                    setRealtimeNotice('Congratulations! Today\'s guided rehabilitation routine completed successfully.');
                  } else {
                    setActiveExercise(null);
                  }
                }}
                onExit={() => {
                  setActiveExercise(null);
                  setIsGuidedRoutineActive(false);
                }}
              />
            )}

            {activeExercise === 'hand_check' && (
              <HandFunctionCheck
                onComplete={() => {
                  loadDashboard();
                  setActiveExercise(null);
                }}
                onExit={() => setActiveExercise(null)}
              />
            )}

            {activeExercise === 'hand_analyzer' && (
              <HandBodyAnalyzer
                onExit={() => setActiveExercise(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Playable Game Modal */}
      {selectedGame && (
        <PlayableGameModal
          game={selectedGame}
          isOpen={true}
          onClose={() => setSelectedGame(null)}
          onGameComplete={() => {
            loadDashboard();
          }}
        />
      )}

      {/* Incoming Video Consultation Alert Banner */}
      {incomingCall && !selectedMeeting && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full bg-slate-900 border-2 border-teal-400 rounded-3xl p-5 shadow-2xl text-white animate-bounce-short">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center animate-pulse">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Incoming Video Consultation</h4>
              <p className="text-xs text-teal-300 font-mono">{incomingCall.callerName || 'Dr. Rajesh Kulkarni, PT'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mb-4">{incomingCall.meetingTitle || 'Weekly Kinematics Evaluation'}</p>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedMeeting({
                  title: incomingCall.meetingTitle || 'Weekly Kinematics Evaluation',
                  scheduled_time: 'Now (Immediate Telehealth)',
                  room_id: incomingCall.roomId || `remotion-room-${patient?.id || 'pt_1'}`
                });
                setIncomingCall(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-teal-500/30 cursor-pointer"
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

      {/* Video Telehealth Consultation Modal */}
      {selectedMeeting && (
        <VideoMeetingModal
          isOpen={true}
          meeting={selectedMeeting}
          currentUser={currentUser || { role: 'patient', name: patient.name }}
          onClose={() => setSelectedMeeting(null)}
        />
      )}

      {/* Floating Global Multilingual Remo Assistant */}
      <RemoAssistant
        userRole="patient"
        initialLanguage={patient.primary_language || 'hi'}
        isExerciseActive={!!activeExercise}
      />
    </div>
  );
}
