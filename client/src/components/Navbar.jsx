import React, { useState } from 'react';
import {
  Activity, Shield, User, Stethoscope, Gamepad2, Settings,
  LogOut, Headset, ChevronDown, Check, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({
  currentPortal,
  setCurrentPortal,
  currentUser,
  onOpenHeadsetModal,
  headsetStatus = { isConnected: false, deviceName: 'Disconnected' },
  onLogout
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      api.logout();
      setCurrentPortal('signin');
    }
  };

  // Themed portal metadata
  const portalMeta = {
    patient: {
      title: 'Patient Recovery Portal',
      badgeColor: 'bg-teal-950/80 text-teal-300 border-teal-700/60',
      dotColor: 'bg-teal-400',
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

  const PortalIcon = portalMeta.icon;

  const isExplorerPortal = currentPortal === 'explorer' || currentPortal === 'gaming';

  return (
    <header className="sticky top-0 z-40 w-full flex flex-col bg-[#080d18]/95 backdrop-blur-xl border-b border-slate-800">
      {/* Main Single-Portal Top Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Portal Identification */}
        <div className="flex items-center space-x-3.5">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30"
          >
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-lg font-bold font-display tracking-tight text-white">
                ReMotion
              </span>
              <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 ${portalMeta.badgeColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${portalMeta.dotColor} animate-pulse`}></span>
                <span>{portalMeta.title}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Tools: Headset Status (Explorer only), Persona Pill & Logout */}
        <div className="flex items-center space-x-3">
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
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] font-bold text-cyan-300 border border-slate-700">
                {currentUser.avatar || currentUser.name?.slice(0, 2).toUpperCase() || 'RM'}
              </div>
              <div className="text-left">
                <div className="font-semibold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono capitalize">{currentUser.role}</div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/60 text-slate-300 hover:text-rose-200 text-xs font-mono transition-all cursor-pointer"
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
