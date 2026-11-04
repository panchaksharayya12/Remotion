import React, { useState } from 'react';
import {
  Activity, Eye, EyeOff, Lock, Mail, Loader2, Sparkles, CheckCircle2,
  Stethoscope, User, Shield, Gamepad2, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

const PORTALS = [
  {
    id: 'therapist',
    label: 'Physical Therapist',
    tag: 'Clinical Command',
    icon: Stethoscope,
    email: 'therapist@remotion.health',
    password: 'therapist123',
    color: 'from-blue-600 to-indigo-600',
    activeBorder: 'border-blue-500 ring-2 ring-blue-500/30',
    activeBg: 'bg-blue-950/60 text-white',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    buttonColor: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
  },
  {
    id: 'patient',
    label: 'Patient Portal',
    tag: 'Rehab Workspace',
    icon: User,
    email: 'patient@remotion.health',
    password: 'patient123',
    color: 'from-teal-600 to-emerald-600',
    activeBorder: 'border-teal-500 ring-2 ring-teal-500/30',
    activeBg: 'bg-teal-950/60 text-white',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    buttonColor: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950'
  },
  {
    id: 'admin',
    label: 'Administrator',
    tag: 'System Ops & Security',
    icon: Shield,
    email: 'admin@remotion.health',
    password: 'admin123',
    color: 'from-purple-600 to-pink-600',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/30',
    activeBg: 'bg-purple-950/60 text-white',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    buttonColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
  },
  {
    id: 'guest',
    label: 'Tech Explorer',
    tag: 'VR Games & 3D Tour',
    icon: Gamepad2,
    email: 'guest@remotion.health',
    password: 'guest123',
    color: 'from-amber-600 to-cyan-600',
    activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/30',
    activeBg: 'bg-cyan-950/60 text-white',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    buttonColor: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
  }
];

export default function SignInPage({ onAuthSuccess, onNavigateRegister }) {
  const [selectedRole, setSelectedRole] = useState('therapist');
  const [email, setEmail] = useState('therapist@remotion.health');
  const [password, setPassword] = useState('therapist123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);

  const activePortalConfig = PORTALS.find(p => p.id === selectedRole) || PORTALS[0];

  const handlePortalSwitch = (portalId) => {
    setSelectedRole(portalId);
    const target = PORTALS.find(p => p.id === portalId);
    if (target) {
      setEmail(target.email);
      setPassword(target.password);
    }
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    setForgotNotice(false);
  };

  const validate = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (!email.trim()) {
      setEmailError('Please enter your email address');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter your password');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGeneralError('');
    setForgotNotice(false);

    try {
      const res = await api.login(email.trim(), password, selectedRole);
      setLoading(false);
      onAuthSuccess(res.user);
    } catch (err) {
      setLoading(false);
      setGeneralError(err.message || 'Invalid email or password. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Main Single Sign-In Container */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30 mb-3">
            <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black font-display tracking-tight text-white">
              ReMotion
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 font-bold">
              AR/VR XR2
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-3">
            Clinical Portal Login
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose your portal role to launch your rehabilitation workspace
          </p>
        </div>

        {/* 4-Portal Role Selector Tabs */}
        <div className="mb-6">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-bold flex items-center justify-between">
            <span>Select Portal Workspace:</span>
            <span className="text-cyan-400 lowercase text-[10px]">active: {activePortalConfig.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              const isActive = selectedRole === portal.id;
              return (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => handlePortalSwitch(portal.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? `${portal.activeBorder} ${portal.activeBg} shadow-md`
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/10 text-white' : 'bg-slate-900 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold">{portal.label}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono truncate">
                    {portal.tag}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs text-center animate-shake">
            {generalError}
          </div>
        )}

        {/* Forgot Password Notice */}
        {forgotNotice && (
          <div className="mb-5 p-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs text-center leading-relaxed">
            For security, clinical password resets are handled via your assigned physical therapist or platform administrator.
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-[10px] text-slate-400 lowercase">{activePortalConfig.label} account</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="name@example.com"
                disabled={loading}
                className={`w-full bg-slate-950 text-white placeholder-slate-500 text-sm rounded-xl px-3.5 py-3 border transition-colors focus:outline-none ${
                  emailError
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-cyan-400'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-400 font-mono">
                {emailError}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 font-mono">
                Password
              </label>
              <button
                type="button"
                onClick={() => setForgotNotice(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter your password"
                disabled={loading}
                className={`w-full bg-slate-950 text-white placeholder-slate-500 text-sm rounded-xl pl-3.5 pr-11 py-3 border transition-colors focus:outline-none ${
                  passwordError
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-cyan-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1.5 text-xs text-rose-400 font-mono">
                {passwordError}
              </p>
            )}
          </div>

          {/* Dynamic Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3.5 px-4 rounded-xl ${activePortalConfig.buttonColor} font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in to {activePortalConfig.label}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Create Account Link */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={onNavigateRegister}
              className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors ml-1"
            >
              Create patient account
            </button>
          </p>
        </div>
      </div>

      {/* Permanent Academic Disclaimer */}
      <div className="mt-8 text-center text-xs text-slate-500 font-mono max-w-md">
        Prototype - synthetic healthcare data - not a medical device. Built for academic research and motor rehabilitation support.
      </div>
    </div>
  );
}