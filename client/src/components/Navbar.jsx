import React, { useState } from 'react';
import {
  Activity, Shield, User, Stethoscope, Gamepad2, Settings,
  LogOut, Headset, ChevronDown, Check, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({
  currentPortal,
  setCurrentPortal,
  onSwitchRole,
  currentUser,
  onOpenHeadsetModal,
  headsetStatus = { isConnected: false, deviceName: 'Disconnected' },
  onLogout
}) {
  const [isPortalMenuOpen, setIsPortalMenuOpen] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      api.logout();
      setCurrentPortal('signin');
    }
  };

  const isLight = currentPortal === 'patient';

  // Themed portal metadata
  const portalMeta = {
    patient: {
      title: 'Patient Recovery Portal',
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      dotColor: 'bg-teal-600',
      icon: User
    },
    therapist: {
      title: 'Therapist Clinical Workstation',
      badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
      dotColor: 'bg-blue-400',
      icon: Stethoscope
    },
    admin: {
      title: 'Hospital Administration Console',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
      dotColor: 'bg-purple-400',
      icon: Shield
    },
    gaming: {
      title: 'Tech Explorer & Headset Showcase',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
      dotColor: 'bg-cyan-400',
      icon: Headset
    },
    explorer: {
      title: 'Tech Explorer & Headset Showcase',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
      dotColor: 'bg-cyan-400',
      icon: Headset
    }
  }[currentPortal] || {
    title: 'ReMotion Workspace',
    badgeColor: 'bg-slate-900 text-slate-400 border-slate-800',
    dotColor: 'bg-slate-400',
    icon: Activity
  };

  const isExplorerPortal = currentPortal === 'explorer' || currentPortal === 'gaming';

  const headerBgClass = isLight
    ? 'bg-white/95 text-slate-900 border-b border-teal-200 shadow-sm'
    : currentPortal === 'therapist'
    ? 'bg-[#152a45]/95 text-white border-b border-blue-900/60 shadow-md'
    : currentPortal === 'admin'
    ? 'bg-[#0b101c]/95 text-white border-b border-purple-950/80 shadow-md'
    : 'bg-[#080d18]/95 text-white border-b border-cyan-900/40 shadow-md';

  const brandTextClass = isLight ? 'text-slate-900' : 'text-white';

  const roles = [
    { id: 'patient', label: 'Patient Portal', persona: 'Asha Sharma' },
    { id: 'therapist', label: 'Therapist Portal', persona: 'Dr. Rajesh Kulkarni' },
    { id: 'admin', label: 'Admin Portal', persona: 'Hospital Admin' },
    { id: 'explorer', label: 'Explorer Portal', persona: '3D VR Headset' }
  ];

  return (
    <header className={`sticky top-0 z-40 w-full flex flex-col ${headerBgClass} backdrop-blur-xl transition-colors duration-200`}>
      {/* Main Single-Portal Top Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Portal Identification */}
        <div className="flex items-center space-x-3.5">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30 shrink-0"
          >
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <span className={`text-lg font-bold font-display tracking-tight ${brandTextClass}`}>
                ReMotion
              </span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 ${portalMeta.badgeColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${portalMeta.dotColor} animate-pulse`}></span>
                <span>{portalMeta.title}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right Action Tools: Quick Switcher, Headset, Persona, Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Demo Portal Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsPortalMenuOpen(!isPortalMenuOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                isLight
                  ? 'bg-teal-50 border-teal-300 text-teal-900 hover:bg-teal-100'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
              title="Switch active rehabilitation portal"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-teal-700' : 'text-cyan-400'}`} />
              <span className="hidden md:inline font-sans">Switch Portal</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isPortalMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 z-50 animate-slideDown text-slate-900 font-sans">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-100">
                  Switch Active Portal
                </div>
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setIsPortalMenuOpen(false);
                      if (onSwitchRole) onSwitchRole(r.id);
                      else setCurrentPortal(r.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      currentPortal === r.id
                        ? 'bg-teal-50 text-teal-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{r.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.persona}</div>
                    </div>
                    {currentPortal === r.id && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Headset Device Status Pill - Strictly displayed ONLY in Explorer / Gaming portal */}
          {isExplorerPortal && (
            <button
              onClick={onOpenHeadsetModal}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                headsetStatus.isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Click to manage WebXR / Meta Quest Headset connection"
            >
              <Headset className={`w-3.5 h-3.5 ${headsetStatus.isConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {headsetStatus.isConnected ? headsetStatus.deviceName : 'Headset: Ready'}
              </span>
              <span className={`w-2 h-2 rounded-full ${headsetStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
            </button>
          )}

          {/* Current User Persona Chip */}
          {currentUser && (
            <div className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs ${
              isLight
                ? 'bg-teal-50 border-teal-200 text-slate-800'
                : 'bg-slate-900/90 border-slate-800 text-slate-100'
            }`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold border ${
                isLight
                  ? 'bg-teal-200 text-teal-900 border-teal-300'
                  : 'bg-slate-800 text-cyan-300 border-slate-700'
              }`}>
                {currentUser.avatar || currentUser.name?.slice(0, 2).toUpperCase() || 'RM'}
              </div>
              <div className="text-left">
                <div className={`font-semibold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {currentUser.name}
                </div>
                <div className={`text-[10px] font-mono capitalize ${isLight ? 'text-teal-800 font-bold' : 'text-slate-400'}`}>
                  {currentUser.role}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-rose-50 border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700'
                : 'bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/60 text-slate-300 hover:text-rose-200'
            }`}
            title="Sign out of ReMotion"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
