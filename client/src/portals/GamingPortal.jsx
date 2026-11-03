import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Trophy, Zap, Play, Search, Filter,
  Sparkles, CheckCircle2, Star, Activity, Headset, ArrowRight,
  Cpu, Layers, Eye, Sliders, Clock, Target, Award,
  ShieldCheck, RefreshCw, BarChart3, Settings as SettingsIcon,
  Video, Laptop, Check, Flame, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import PlayableGameModal from './PlayableGameModal';
import Headset3DViewer from '../components/Headset3DViewer';
import GameThumbnail from '../components/GameThumbnail';
import DeviceManager from '../components/DeviceManager';
import CameraSetup from '../components/CameraSetup';
import { webxrService } from '../services/webxr';

export default function GamingPortal({ onOpenHeadsetModal }) {
  const [activeTab, setActiveTab] = useState('explore'); // explore, games, headset, connect, sessions, scores, settings
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [xrStatus, setXrStatus] = useState(webxrService.getStatus());
  const [recentSessions, setRecentSessions] = useState([
    { id: 's1', game: 'Badminton', date: 'Today, 10:15 AM', score: 8, duration: '2m 45s', accuracy: 92, reps: 10, mode: 'Hand Tracking' },
    { id: 's2', game: 'Cricket Batting Practice', date: 'Yesterday', score: 14, duration: '4m 10s', accuracy: 88, reps: 12, mode: 'WebXR Controller' },
    { id: 's3', game: 'Table Tennis Rally', date: 'Nov 01, 2026', score: 7, duration: '3m 20s', accuracy: 95, reps: 7, mode: 'Desktop Simulation' },
    { id: 's4', game: 'Basketball Free Throw', date: 'Oct 31, 2026', score: 9, duration: '3m 50s', accuracy: 90, reps: 10, mode: 'Hand Tracking' }
  ]);

  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, name: 'Asha Verma', score: 2850, level: 3, streak: 8, badge: 'Master Rally' },
    { rank: 2, name: 'Suresh Patil', score: 2420, level: 2, streak: 5, badge: 'Grip Champion' },
    { rank: 3, name: 'Meena Rao', score: 2180, level: 2, streak: 6, badge: 'Rapid Reflex' },
    { rank: 4, name: 'Kiran Nambiar', score: 1950, level: 2, streak: 3, badge: 'Precision Striker' }
  ]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const res = await api.getGames();
        setGames(res.games || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load games:', err);
        setLoading(false);
      }
    };
    fetchGames();

    const unsub = webxrService.subscribe((status) => {
      setXrStatus(status);
    });
    return () => unsub();
  }, []);

  const categories = [
    'All',
    'Sports Simulation',
    'Reflex & Precision',
    'Range & Speed',
    'Cognitive & Motor',
    'Upper Limb',
    'Lower Limb',
    'Full Body'
  ];

  const filteredGames = games.filter(g => {
    const matchesCat = selectedCategory === 'All' ||
      g.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      g.tags?.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          g.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const featuredGame = games.find(g => g.id === 'game_badminton') || games[0] || {
    id: 'game_badminton',
    title: 'Badminton Overhead Rally',
    category: 'Sports Simulation',
    description: 'Intercept high-trajectory shuttlecocks using overhead shoulder abduction and swift forearm pronation.',
    difficulty: 'Moderate',
    rehab_focus: 'Overhead Shoulder Abduction & Forearm Pronation'
  };

  const handleGameComplete = (result) => {
    // Add to recent sessions
    setRecentSessions(prev => [
      {
        id: 's_' + Date.now(),
        game: result.gameTitle || selectedGame?.title || 'Rehab Game',
        date: 'Just now',
        score: result.score || 10,
        duration: `${Math.floor((result.duration || 120) / 60)}m ${(result.duration || 120) % 60}s`,
        accuracy: Math.round(result.accuracy || 90),
        reps: result.repetitions || 10,
        mode: xrStatus.isConnected ? (xrStatus.deviceType || 'WebXR Headset') : 'Desktop Simulation'
      },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 pb-24 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Cinematic Glowing Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[350px] bg-gradient-to-b from-cyan-600/15 via-blue-600/10 to-transparent blur-[140px] pointer-events-none" />

      {/* Main Navigation Subheader for Explorer Portal (7 Tabs) */}
      <div className="sticky top-16 z-30 bg-[#070c18]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {[
              { id: 'explore', label: 'Explore', icon: Sparkles },
              { id: 'games', label: `Games (${games.length})`, icon: Gamepad2 },
              { id: 'headset', label: 'Headset Explorer', icon: Cpu },
              { id: 'connect', label: 'Connect Device', icon: Headset },
              { id: 'sessions', label: 'My Sessions', icon: Clock },
              { id: 'scores', label: 'My Scores', icon: Trophy },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/25 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Hardware Status Indicator */}
          <div className="hidden md:flex items-center space-x-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${xrStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-400">
              {xrStatus.isConnected ? xrStatus.deviceType : 'Simulator Mode'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ========================================================================= */}
        {/* TAB 1: EXPLORE (HERO, QUICK ACCESS, FEATURED, RECENT, LEADERBOARD)        */}
        {/* ========================================================================= */}
        {activeTab === 'explore' && (
          <div className="space-y-10">
            {/* Quick-Access Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">HARDWARE STATUS:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                    xrStatus.isConnected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}>
                    {xrStatus.isConnected ? `${xrStatus.deviceType} Connected` : 'Desktop Simulation Mode'}
                  </span>
                </div>
                <div className="hidden sm:flex items-center space-x-2">
                  <span className="text-slate-400">INPUT:</span>
                  <span className="text-cyan-400 font-bold">Webcam / Hand Tracking / Mouse</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab('connect')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Headset className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Configure Device</span>
                </button>
                <button
                  onClick={() => setActiveTab('headset')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3D Headset Model</span>
                </button>
              </div>
            </div>

            {/* Featured Hero Banner */}
            <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-[#081024] border border-cyan-500/30 overflow-hidden p-8 sm:p-12 shadow-2xl">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none hidden md:block">
                <div className="w-full h-full bg-gradient-to-l from-cyan-500/20 to-transparent" />
              </div>

              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Featured Rehabilitation Game</span>
                  <span className="w-1 h-1 rounded-full bg-cyan-400" />
                  <span className="text-white">Objective-Based (No Timeouts)</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight">
                  {featuredGame.title}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {featuredGame.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block font-bold">DIFFICULTY</span>
                    <span className="text-cyan-300 font-bold text-sm">{featuredGame.difficulty || 'Moderate'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block font-bold">TARGET MOTORS</span>
                    <span className="text-teal-300 font-bold text-sm">Shoulder & Grip</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 text-[10px] block font-bold">GOAL</span>
                    <span className="text-amber-300 font-bold text-sm">10 Rallies Completed</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setSelectedGame(featuredGame)}
                    className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play {featuredGame.title.split(' ')[0]} Now</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('games')}
                    className="flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-all"
                  >
                    <span>Browse All 22 Games</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2-Column: Recently Played Sessions vs Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Recently Played */}
              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Recent Game Sessions</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('sessions')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {recentSessions.slice(0, 3).map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">{sess.game}</div>
                        <div className="text-slate-400 text-[11px] font-mono">
                          {sess.date} • Mode: <span className="text-cyan-300">{sess.mode}</span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-emerald-400 font-bold text-sm">{sess.accuracy}% Acc</div>
                        <div className="text-slate-400 text-[11px]">Duration: {sess.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard / Personal Bests */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Rehab Leaderboard</span>
                  </h3>
                  <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                    Top Clinicians
                  </span>
                </div>

                <div className="space-y-2.5">
                  {leaderboard.map((u) => (
                    <div
                      key={u.rank}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                        u.rank === 1
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-slate-950/60 border-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black font-mono text-xs ${
                          u.rank === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.rank}
                        </span>
                        <div>
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {u.badge} • Streak: {u.streak}d
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-cyan-300 font-bold">{u.score} XP</div>
                        <div className="text-[10px] text-slate-400">Level {u.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GAMES (22 GAMES GALLERY WITH CUSTOM SVG ARTWORK & NO TIMEOUT)      */}
        {/* ========================================================================= */}
        {activeTab === 'games' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">
                  Rehabilitation Game Library
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  22 full-featured interactive rehabilitation games with custom physics, realistic visual rendering, and objective-based completion.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games or skills..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-950/50 flex flex-col justify-between group"
                >
                  {/* Custom Illustrated Thumbnail */}
                  <div className="relative">
                    <GameThumbnail gameId={game.id} title={game.title} category={game.category} />
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-cyan-300 font-bold border border-cyan-800/60">
                      {game.difficulty || 'All Levels'}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-1">
                        {game.category}
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Target: <strong className="text-slate-200">Upper Limb</strong></span>
                        <span className="text-teal-400">Target-Based</span>
                      </div>

                      <button
                        onClick={() => setSelectedGame(game)}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-600/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Game</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HEADSET EXPLORER (3D HEADSET WITH 17 CLINICAL SUBSYSTEMS)          */}
        {/* ========================================================================= */}
        {activeTab === 'headset' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-bold font-display text-white">
                Interactive Mixed-Reality Headset Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Inspect 17 precision optical, sensing, and compute subsystems engineered for clinical motor rehabilitation. Click components to review engineering specs and clinical roles.
              </p>
            </div>

            <Headset3DViewer />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CONNECT DEVICE (EMBEDS DEVICEMANAGER.JSX)                          */}
        {/* ========================================================================= */}
        {activeTab === 'connect' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-bold font-display text-white">
                WebXR Hardware & Headset Manager
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pair Meta Quest 3/3S or PICO 4 Ultra via native WebXR over secure browser session, or engage Desktop Simulator Mode for offline workstation evaluation.
              </p>
            </div>

            <DeviceManager />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MY SESSIONS (HISTORICAL GAMEPLAY LOGS)                             */}
        {/* ========================================================================= */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">
                  My Game Sessions & Telemetry
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Complete historical record of motor rehabilitation sessions, repetitions, kinematic accuracy, and duration.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-full">
                {recentSessions.length} Recorded Sessions
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-4">Game Title</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Input Mode</th>
                      <th className="p-4">Reps Completed</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Accuracy</th>
                      <th className="p-4 text-right">XP Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {recentSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white font-sans text-xs">
                          {s.game}
                        </td>
                        <td className="p-4 text-slate-400">{s.date}</td>
                        <td className="p-4 text-cyan-300">{s.mode}</td>
                        <td className="p-4 text-slate-200">{s.reps} Reps</td>
                        <td className="p-4 text-slate-400">{s.duration}</td>
                        <td className="p-4">
                          <span className="text-emerald-400 font-bold">{s.accuracy}%</span>
                        </td>
                        <td className="p-4 text-right text-cyan-400 font-bold">
                          +{s.score * 10} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MY SCORES (LEADERBOARDS & ACHIEVEMENTS)                            */}
        {/* ========================================================================= */}
        {activeTab === 'scores' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-bold font-display text-white">
                Personal Bests & Achievement Milestones
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Track your motor rehabilitation milestones, levels, badges, and high scores across all interactive games.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">CUMULATIVE EXPERIENCE</span>
                <span className="text-2xl font-black text-cyan-400 mt-1 block">2,850 XP</span>
                <span className="text-slate-400 text-[10px] mt-2 block">Level 3 • Next Level: 3,500 XP</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">ACTIVE REHAB STREAK</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block flex items-center">
                  <Flame className="w-5 h-5 mr-1 fill-current text-amber-500" />
                  8 Days
                </span>
                <span className="text-slate-400 text-[10px] mt-2 block">Personal Best Streak: 12 Days</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">UNLOCKED ACHIEVEMENTS</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">14 / 22 Badges</span>
                <span className="text-slate-400 text-[10px] mt-2 block">Master Rally, Rapid Reflex, Iron Grip</span>
              </div>
            </div>

            {/* Achievement Badges Showcase */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Rehabilitation Achievement Badges
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { name: 'Master Rally', desc: '10 consecutive badminton returns', unlocked: true },
                  { name: 'Iron Grip', desc: '95%+ squeeze clench accuracy', unlocked: true },
                  { name: 'Pitch Perfect', desc: '12 cricket strokes timed cleanly', unlocked: true },
                  { name: '3D Spatial Reach', desc: 'Full shoulder abduction in 3D', unlocked: true },
                  { name: 'Pin Crusher', desc: 'Score a strike in 3D Bowling', unlocked: true },
                  { name: 'Basket Master', desc: 'Sink 10 free throws in a row', unlocked: true },
                  { name: 'Speed Demon', desc: 'Reaction latency under 300ms', unlocked: false },
                  { name: 'Grandmaster', desc: '30-day continuous rehabilitation streak', unlocked: false },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border ${
                      b.unlocked
                        ? 'bg-slate-950 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-950/40 border-slate-800/50 text-slate-600 opacity-60'
                    }`}
                  >
                    <Award className={`w-8 h-8 mx-auto mb-2 ${b.unlocked ? 'text-amber-400' : 'text-slate-600'}`} />
                    <div className="font-bold text-xs text-white">{b.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{b.desc}</div>
                    <span className={`inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded-full ${
                      b.unlocked ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {b.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: SETTINGS (CAMERA CALIBRATION, INPUT SELECTOR, AUDIO)               */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-bold font-display text-white">
                Explorer & Hardware Settings
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Calibrate optical hand tracking webcam, configure audio feedback, and adjust WebXR simulation parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <CameraSetup />
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    Audio & Visual Preferences
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span>Sound Effects (Haptic SFX)</span>
                      <span className="text-cyan-400 font-mono font-bold">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span>Synthesizer Audio Pitch Biofeedback</span>
                      <span className="text-cyan-400 font-mono font-bold">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span>WebXR Desktop Simulator Mode</span>
                      <span className="text-emerald-400 font-mono font-bold">Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playable Game Modal (No 30-Second Timeout!) */}
      {selectedGame && (
        <PlayableGameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onComplete={handleGameComplete}
        />
      )}
    </div>
  );
}
