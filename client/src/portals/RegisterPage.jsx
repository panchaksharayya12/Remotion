import React, { useState } from 'react';
import { Activity, ArrowLeft, Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function RegisterPage({ onAuthSuccess, onNavigateLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('patient');
  const [condition, setCondition] = useState('Post-Stroke Motor Rehabilitation');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || '+91 98450 00000',
        condition
      });

      // Synchronize with Therapist portal immediately
      try {
        const bc = new BroadcastChannel('remotion_telehealth_sync');
        bc.postMessage({
          type: 'NEW_PATIENT_REGISTERED',
          user: res.user,
          patient: res.patient,
          timestamp: Date.now()
        });
        bc.close();
      } catch (e) {}

      try {
        localStorage.setItem('remotion_patient_registered_signal', JSON.stringify({
          type: 'NEW_PATIENT_REGISTERED',
          user: res.user,
          patient: res.patient,
          timestamp: Date.now()
        }));
      } catch (e) {}

      setLoading(false);
      onAuthSuccess(res.user);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Registration failed. Please check your information.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        <button
          onClick={onNavigateLogin}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display">Create ReMotion Account</h1>
            <p className="text-xs text-slate-400">Join the motor recovery and rehabilitation platform</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
              className="w-full bg-slate-950 text-white placeholder-slate-500 text-sm rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ramesh@example.com"
              required
              className="w-full bg-slate-950 text-white placeholder-slate-500 text-sm rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
              Password (min. 6 characters) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a secure password"
                required
                className="w-full bg-slate-950 text-white placeholder-slate-500 text-sm rounded-xl pl-3.5 pr-10 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                Account Type
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-400"
              >
                <option value="patient">Patient (Motor Recovery)</option>
                <option value="explorer">VR Games & Tech Reviewer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98450 00000"
                className="w-full bg-slate-950 text-white placeholder-slate-500 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {role === 'patient' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                Rehabilitation Condition / Focus
              </label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="e.g. Post-Stroke Left Hemiparesis, Flexor Strain"
                className="w-full bg-slate-950 text-white placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <button
            onClick={onNavigateLogin}
            className="text-cyan-400 hover:underline font-semibold"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
}
