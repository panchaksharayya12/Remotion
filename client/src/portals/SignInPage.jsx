import React, { useState } from 'react';
import { Activity, Eye, EyeOff, Lock, Mail, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function SignInPage({ onAuthSuccess, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);

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
      const res = await api.login(email.trim(), password);
      setLoading(false);
      onAuthSuccess(res.user);
    } catch (err) {
      setLoading(false);
      setGeneralError(err.message || 'Invalid email or password. Please verify your credentials.');
    }
  };

  // Discreet 1-click quick-fill for evaluators
  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    setForgotNotice(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Single Sign-In Container */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center text-center mb-8">
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
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-4">
            Welcome back
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your rehabilitation workspace
          </p>
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

        {/* Clean Sign-In Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
              Email Address
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

          {/* Password Field with Show/Hide Toggle */}
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

          {/* Prominent Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
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
              Create account
            </button>
          </p>
        </div>

        {/* Discreet Quick Demo Credentials Pill Bar (Zero Clutter, 1-Click Convenience) */}
        <div className="mt-6 pt-4 border-t border-slate-800/60">
          <div className="text-[10px] font-mono uppercase text-slate-500 text-center mb-2 font-semibold tracking-wider">
            Quick-Fill Demo Credentials
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => fillDemo('patient@remotion.health', 'patient123')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-teal-300 border border-slate-800 hover:border-teal-500/50 transition-all text-left flex items-center justify-between"
            >
              <span>Asha (Patient)</span>
              <span className="text-[9px] text-slate-500">Auto</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('therapist@remotion.health', 'therapist123')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-blue-300 border border-slate-800 hover:border-blue-500/50 transition-all text-left flex items-center justify-between"
            >
              <span>Dr. Rajesh (PT)</span>
              <span className="text-[9px] text-slate-500">Auto</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@remotion.health', 'admin123')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-purple-300 border border-slate-800 hover:border-purple-500/50 transition-all text-left flex items-center justify-between"
            >
              <span>Administrator</span>
              <span className="text-[9px] text-slate-500">Auto</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('guest@remotion.health', 'guest123')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500/50 transition-all text-left flex items-center justify-between"
            >
              <span>Tech Explorer</span>
              <span className="text-[9px] text-slate-500">Auto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permanent Academic Disclaimer */}
      <div className="mt-8 text-center text-xs text-slate-500 font-mono max-w-md">
        Prototype - synthetic demo data - not a medical device. Built for academic research and motor rehabilitation support.
      </div>
    </div>
  );
}
