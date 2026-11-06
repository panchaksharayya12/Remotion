import React, { useState, useEffect } from 'react';
import {
  Activity, Sparkles, ArrowRight, Shield, Layers, Award,
  Cpu, Headset, Play, CheckCircle2, ChevronRight, Zap, Eye,
  BarChart3, Stethoscope, Gamepad2, UserCheck
} from 'lucide-react';

export default function LandingPage({
  onNavigatePortal,
  onOpenHeadsetModal
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#080c14] text-slate-100 overflow-hidden">
      {/* Background Cinematic Atmosphere: Electric Blue Spotlight Glows & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-cyan-600/20 via-blue-700/10 to-transparent blur-[120px] rounded-full"
          style={{ transform: `translate(calc(-50% + ${mousePos.x}px), ${mousePos.y}px)` }}
        />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-blue-600/15 blur-[110px] rounded-full" />
        {/* Subtle Perspective Floor Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* Hero Section (KAEL-9 & MotionSites Inspired) */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Tech Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono mb-8 shadow-xl shadow-cyan-950/40 backdrop-blur-md animate-fadeIn">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-semibold tracking-wider uppercase">ReMotion Platform Architecture</span>
          <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
          <span className="text-slate-400">AR/VR Motor Rehabilitation</span>
        </div>

        {/* Oversized Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tight text-white max-w-5xl leading-[1.05]">
          Recovery <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            Beyond Reality.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
          The next-generation mixed-reality neuro-rehabilitation platform combining real-time computer vision, 6-DoF spatial kinematics, and clinical biofeedback.
        </p>

        {/* Call to Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigatePortal('patient')}
            className="flex items-center space-x-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/25 active:scale-95 transition-all"
          >
            <span>Start Recovery</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('headset-explainer');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center space-x-2 px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-white font-semibold text-sm backdrop-blur-md transition-all shadow-lg"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Explore Technology</span>
          </button>

          <button
            onClick={() => onNavigatePortal('gaming')}
            className="flex items-center space-x-2 px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm backdrop-blur-md transition-all shadow-lg"
          >
            <Gamepad2 className="w-4 h-4 text-indigo-400" />
            <span>Enter Experience</span>
          </button>
        </div>

        {/* Live Metrics Quick Counters */}
        <div className="mt-16 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 text-left font-mono">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Spatial Precision</div>
            <div className="text-2xl font-bold text-cyan-400 font-display mt-0.5">&lt; 1.2 mm</div>
            <div className="text-[11px] text-slate-500 mt-1">6-DoF Optical SLAM</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Hand Kinematics</div>
            <div className="text-2xl font-bold text-white font-display mt-0.5">21 Points</div>
            <div className="text-[11px] text-slate-500 mt-1">MediaPipe Vision AI</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sync Latency</div>
            <div className="text-2xl font-bold text-emerald-400 font-display mt-0.5">&lt; 14 ms</div>
            <div className="text-[11px] text-slate-500 mt-1">Real-Time Socket.IO</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Games Catalog</div>
            <div className="text-2xl font-bold text-amber-400 font-display mt-0.5">22 Modules</div>
            <div className="text-[11px] text-slate-500 mt-1">Engaging Motor Tasks</div>
          </div>
        </div>
      </section>

      {/* Signature Feature: Cinematic 3D Headset Explainer */}
      <section id="headset-explainer" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800 mb-3">
            <Cpu className="w-3.5 h-3.5 inline mr-1" />
            Signature Engineering Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-display text-white">
            Cinematic 3D Headset Anatomy
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-2">
            Disassemble the mixed-reality rehabilitation headset in real-time. Inspect each of the 17 modular clinical components and understand their biomechanical contributions.
          </p>
        </div>

        {/* 3D Exploded Viewer Invitation Card */}
        <div className="bg-[#0b1424] border border-cyan-500/30 rounded-3xl p-8 max-w-3xl mx-auto text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Headset className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold font-display text-white mb-2">
            Interactive 3D Mixed-Reality Headset Explainer
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6">
            View exploded kinematics, inspect 17 modular clinical subsystems, and explore pancake optics inside the dedicated Tech Explorer.
          </p>
          <button
            onClick={() => onNavigatePortal('explorer')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25"
          >
            Open 3D Headset in Tech Explorer
          </button>
        </div>
      </section>

      {/* Feature Pillar Sections */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-white">
            Clinical Technology Pillars
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mt-2">
            Engineered specifically to solve post-stroke hemiparesis, upper-limb motor deficits, and neurological rehabilitation compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Hand Rehabilitation */}
          <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-all group backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white font-display mb-3">
              Computer-Vision Hand Therapy
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Real-time 21-landmark tracking analyzes finger flexion, palm span, and clench resistance. Squeeze & Fill combines fluid dynamics with calibrated clench-release metrics.
            </p>
            <ul className="text-xs font-mono text-slate-400 space-y-1.5 border-t border-slate-800 pt-4">
              <li className="flex items-center text-cyan-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                No physical glove or markers needed
              </li>
              <li className="flex items-center text-cyan-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                Dynamic clench calibration threshold
              </li>
            </ul>
          </div>

          {/* Pillar 2: 3D Spatial Coordination */}
          <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all group backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white font-display mb-3">
              Spatial Coordination & Reach
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Reach & Touch maps upper-limb reaching arcs in Three.js 3D space. Evaluates trajectory linearity, reaction latency (ms), and compensatory postural sway.
            </p>
            <ul className="text-xs font-mono text-slate-400 space-y-1.5 border-t border-slate-800 pt-4">
              <li className="flex items-center text-blue-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-blue-400" />
                Near, mid, and far reaching envelopes
              </li>
              <li className="flex items-center text-blue-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-blue-400" />
                Sub-millisecond trajectory logging
              </li>
            </ul>
          </div>

          {/* Pillar 3: Therapist Monitoring & Telemetry */}
          <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 transition-all group backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-teal-950 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white font-display mb-3">
              Real-Time Clinical Telemetry
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Therapists create exercise prescriptions delivered to patients in under 15ms. Live split-screen supervision streams biomechanical data alongside WebRTC video meetings.
            </p>
            <ul className="text-xs font-mono text-slate-400 space-y-1.5 border-t border-slate-800 pt-4">
              <li className="flex items-center text-teal-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-teal-400" />
                Strict therapist-patient data isolation
              </li>
              <li className="flex items-center text-teal-300">
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-teal-400" />
                Live captions & multilingual translation
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Portals Showcase Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1 font-bold">
              Connected Healthcare Ecosystem
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white">
              Four Specialized Experience Portals
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-md mt-2 md:mt-0">
            Each portal tailored with dedicated visual ergonomics for patients, clinicians, administrators, and immersive gameplay.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Patient Portal Card */}
          <div
            onClick={() => onNavigatePortal('patient')}
            className="p-6 rounded-2xl bg-teal-950/20 border border-teal-500/30 hover:border-teal-400 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-4">
              <UserCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
              Patient Portal
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Calm clinical blue/teal aesthetic. Prescriptions, XP leveling, daily streaks, camera exercises, and Remo assistant.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-teal-400">
              <span>Open Patient View</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* 2. Therapist Portal Card */}
          <div
            onClick={() => onNavigatePortal('therapist')}
            className="p-6 rounded-2xl bg-blue-950/20 border border-blue-500/30 hover:border-blue-400 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-4">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
              Therapist Portal
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Professional clinical dashboard. Assigned patient management, prescription dispatch, longitudinal charts, and live monitoring.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-400">
              <span>Open Clinical View</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* 3. Gaming Portal Card */}
          <div
            onClick={() => onNavigatePortal('gaming')}
            className="p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 hover:border-indigo-400 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              Gaming Portal (22)
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Electric-blue dark gaming atmosphere. 22 playable games including Cricket, Baseball, Table Tennis, Balloon Pop, and Fruit Reach.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-indigo-400">
              <span>Launch Games</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* 4. Admin Portal Card */}
          <div
            onClick={() => onNavigatePortal('admin')}
            className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 cursor-pointer transition-all hover:-translate-y-1 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
              Admin Portal
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Dark administrative command center. Excel export/import, therapist assignment, catalog toggles, and live audit logs.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-purple-400">
              <span>Access Admin</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#060910] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white font-display">ReMotion</span>
              <span className="text-xs text-slate-400 ml-2 font-mono">Immersive AR/VR Motor Rehabilitation</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono text-center md:text-right">
            <div>Precision Biofeedback & Tele-Rehabilitation Infrastructure</div>
            <div className="text-[11px] text-slate-600 mt-1">Built with React, Node.js, Three.js, MediaPipe, and WebXR.</div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-900 text-center text-xs text-slate-500 font-mono">
          Prototype - synthetic demo data - not a medical device. Built for academic research and motor rehabilitation support.
        </div>
      </footer>
    </div>
  );
}
