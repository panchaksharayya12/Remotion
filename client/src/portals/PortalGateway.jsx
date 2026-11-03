import React, { useState } from 'react';
import {
  Activity, User, Stethoscope, Shield, Headset,
  ArrowRight, Sparkles, CheckCircle2, ChevronRight,
  Gamepad2, Dumbbell, Globe, Lock, KeyRound
} from 'lucide-react';
import { api } from '../services/api';

export default function PortalGateway({ onSelectPortal, onOpenCustomLogin }) {
  const [loadingRole, setLoadingRole] = useState(null);
  const [selectedPatientKey, setSelectedPatientKey] = useState('asha');

  const handleQuickEnter = async (portalType, options = {}) => {
    try {
      setLoadingRole(portalType);
      if (portalType === 'patient') {
        const patientKey = options.patientKey || selectedPatientKey;
        await api.demoSwitch('patient', { patientKey });
        onSelectPortal('patient');
      } else if (portalType === 'therapist') {
        await api.demoSwitch('therapist');
        onSelectPortal('therapist');
      } else if (portalType === 'admin') {
        await api.demoSwitch('admin');
        onSelectPortal('admin');
      } else if (portalType === 'explorer') {
        await api.demoSwitch('guest');
        onSelectPortal('explorer');
      }
    } catch (err) {
      console.error('Portal sign in error:', err);
      // Fallback: navigate directly
      onSelectPortal(portalType);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-600/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
            <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold font-display tracking-tight text-white">
                ReMotion
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                AR/VR XR2
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Immersive Motor Rehabilitation Platform
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCustomLogin}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <span>Custom Credentials Login</span>
        </button>
      </header>

      {/* Main Portal Selection Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Title & Prompt */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Your Rehabilitation Role</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-white">
            Which portal would you like to enter?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Each portal provides a dedicated workspace designed specifically for patients, clinicians, administrators, or technology reviewers.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* 1. Patient Portal */}
          <div className="group relative bg-[#0b1622] hover:bg-[#0e1d2e] border border-teal-500/30 hover:border-teal-400/80 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-teal-500/10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                  Patient
                </span>
              </div>

              <h2 className="text-xl font-bold font-display text-white mb-2">
                Patient Portal
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Personalized motor exercises, live biofeedback, Squeeze & Fill sponge therapy, and multilingual voice messenger.
              </p>

              {/* Patient Demo Selector */}
              <div className="mb-4 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-teal-400 uppercase tracking-wider mb-2 font-semibold">
                  Select Patient Profile:
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPatientKey('asha')}
                    className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                      selectedPatientKey === 'asha'
                        ? 'bg-teal-950/80 border border-teal-500/60 text-white'
                        : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">Asha Sharma (Age 58)</div>
                      <div className="text-[10px] text-teal-400 font-mono">Post-Stroke Left Hemiparesis</div>
                    </div>
                    {selectedPatientKey === 'asha' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPatientKey('ravi')}
                    className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                      selectedPatientKey === 'ravi'
                        ? 'bg-teal-950/80 border border-teal-500/60 text-white'
                        : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">Ravi Patel (Age 34)</div>
                      <div className="text-[10px] text-teal-400 font-mono">Flexor Tendon & Carpal Strain</div>
                    </div>
                    {selectedPatientKey === 'ravi' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPatientKey('meena')}
                    className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                      selectedPatientKey === 'meena'
                        ? 'bg-teal-950/80 border border-teal-500/60 text-white'
                        : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">Meena Sundaram (Age 46)</div>
                      <div className="text-[10px] text-teal-400 font-mono">Post-Colles Wrist Stiffness</div>
                    </div>
                    {selectedPatientKey === 'meena' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleQuickEnter('patient', { patientKey: selectedPatientKey })}
              disabled={loadingRole === 'patient'}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/25 transition-all"
            >
              <span>{loadingRole === 'patient' ? 'Signing In...' : 'Enter Patient Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Therapist Portal */}
          <div className="group relative bg-[#0a1424] hover:bg-[#0c192e] border border-blue-500/30 hover:border-blue-400/80 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-blue-500/10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  Clinician
                </span>
              </div>

              <h2 className="text-xl font-bold font-display text-white mb-2">
                Therapist Workstation
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Hospital EMR clinical interface, patient telemetry, ROM kinematics, prescription assignment, and multilingual translation.
              </p>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 mb-4">
                <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-1 font-semibold">
                  Clinician Profile:
                </div>
                <div className="font-semibold text-white text-xs">Dr. Rajesh Kulkarni, PT</div>
                <div className="text-[10px] text-slate-400">Lead Neuro-Rehabilitation Specialist</div>
                <div className="text-[10px] text-blue-400 font-mono mt-1">License: MCI-PT-2015-8842</div>
              </div>

              <ul className="text-[11px] text-slate-400 space-y-1.5 mb-4 font-mono">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Caseload: Asha, Ravi, Meena</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Live Telemetry & ROM Angles</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Instant Prescription Push</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickEnter('therapist')}
              disabled={loadingRole === 'therapist'}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/25 transition-all"
            >
              <span>{loadingRole === 'therapist' ? 'Signing In...' : 'Enter Therapist Workstation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3. Admin Portal */}
          <div className="group relative bg-[#0d111c] hover:bg-[#111726] border border-slate-700/60 hover:border-slate-500 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-700">
                  Admin
                </span>
              </div>

              <h2 className="text-xl font-bold font-display text-white mb-2">
                Executive Admin
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Clinical accounts, Excel reports export, hardware inventory telemetry, database maintenance, and audit trails.
              </p>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-4">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                  System Operator:
                </div>
                <div className="font-semibold text-white text-xs">System Administrator</div>
                <div className="text-[10px] text-slate-400">Clinical Operations IT</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Full Database Read/Write</div>
              </div>

              <ul className="text-[11px] text-slate-400 space-y-1.5 mb-4 font-mono">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Excel XLSX Export & Import</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>22 Games Catalog Activation</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Baseline Data Reset</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickEnter('admin')}
              disabled={loadingRole === 'admin'}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-600 transition-all"
            >
              <span>{loadingRole === 'admin' ? 'Signing In...' : 'Enter Admin Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 4. Tech Explorer & Headset Showcase */}
          <div className="group relative bg-[#09152b] hover:bg-[#0c1d3c] border border-cyan-500/40 hover:border-cyan-400 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-cyan-500/20">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Headset className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 animate-pulse">
                  3D Showcase
                </span>
              </div>

              <h2 className="text-xl font-bold font-display text-white mb-2">
                Tech Explorer
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Signature 3D interactive mixed-reality headset explainer with exploded component view and 22 playable rehabilitation games.
              </p>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-cyan-900/60 mb-4">
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1 font-semibold flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Interactive Highlights:</span>
                </div>
                <div className="font-semibold text-white text-xs">3D Exploded Headset Model</div>
                <div className="text-[10px] text-cyan-300">17 Selectable Clinical Subsystems</div>
              </div>

              <ul className="text-[11px] text-slate-300 space-y-1.5 mb-4 font-mono">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Badminton, Cricket, Basketball</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Real Court & Ball Physics</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Pancake Optics & Sensor Specs</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleQuickEnter('explorer')}
              disabled={loadingRole === 'explorer'}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all"
            >
              <span>{loadingRole === 'explorer' ? 'Launching...' : 'Launch 3D Explorer & Games'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          <span className="text-slate-400 font-semibold">ReMotion Motor Rehabilitation Platform</span>
        </div>
        <div>
          Computer Vision • 6-DoF XR Kinematics • Precision Biofeedback
        </div>
      </footer>
    </div>
  );
}