import React, { useState } from 'react';
import {
  X, Lock, Mail, User, Shield, Stethoscope, Gamepad2, ArrowRight,
  Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('patient@remotion.health');
  const [password, setPassword] = useState('patient123');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleDemoSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'patient') {
      setEmail('patient@remotion.health');
      setPassword('patient123');
    } else if (selectedRole === 'therapist') {
      setEmail('therapist@remotion.health');
      setPassword('therapist123');
    } else if (selectedRole === 'admin') {
      setEmail('admin@remotion.health');
      setPassword('admin123');
    } else if (selectedRole === 'guest') {
      setEmail('guest@remotion.health');
      setPassword('guest123');
    }
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // Register flow
        setError('Registration is managed via the Administrator Portal or clinician enrollment.');
        setLoading(false);
        return;
      }

      const res = await api.login(email, password);
      setLoading(false);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0c1322] border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3 border border-cyan-400/30">
            <Shield className="w-6 h-6 text-slate-950" />
          </div>
          <h3 className="text-xl font-bold text-white font-display">
            ReMotion Portal Authentication
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose your role to access the corresponding rehabilitation portal.
          </p>
        </div>

        {/* 4-Portal Role Selector */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 mb-2 font-semibold flex items-center justify-between">
            <span>Select Portal Role:</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoSelect('therapist')}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                role === 'therapist' ? 'bg-blue-950/60 text-blue-300 border-blue-500/50 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                <span>Therapist</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Dr. Rajesh, PT</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('patient')}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                role === 'patient' ? 'bg-teal-950/60 text-teal-300 border-teal-500/50 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>Patient</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Asha Sharma</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('admin')}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                role === 'admin' ? 'bg-purple-950/60 text-purple-300 border-purple-500/50 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Administrator</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">System Admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('guest')}
              className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                role === 'guest' ? 'bg-amber-950/60 text-amber-300 border-amber-500/50 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Tech Explorer</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">VR Simulator</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 font-bold text-xs hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? <span>Authenticating...</span> : <span>Sign In as {role.toUpperCase()}</span>}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
