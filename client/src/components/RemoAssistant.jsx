import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, X, Send, Mic, MicOff, Volume2, VolumeX,
  Minimize2, Maximize2, ShieldAlert, Sparkles, Globe, ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'hinglish', label: 'Hinglish', native: 'Hinglish' }
];

export default function RemoAssistant({ isExerciseActive = false, userRole = 'patient', initialLanguage = 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentLang, setCurrentLang] = useState(initialLanguage);
  const [mascotState, setMascotState] = useState('idle'); // idle, thinking, encouraging, happy, concerned
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'remo',
      text: 'Hello! I am Remo, your rehabilitation companion. How can I assist your recovery today?',
      timestamp: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-collapse during active exercise session to avoid blocking camera or emergency stop!
  useEffect(() => {
    if (isExerciseActive) {
      setIsOpen(false);
      setIsMinimized(true);
    }
  }, [isExerciseActive]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Voice Recognition (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'kn' ? 'kn-IN' : currentLang === 'ta' ? 'ta-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setInputText(transcript);
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Text-to-Speech (Web Speech API)
  const speakText = (text) => {
    if (!isSpeakingEnabled || typeof window === 'undefined' || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText || inputText || '').trim();
    if (!textToSend) return;

    // Prevent duplicate consecutive user message submission
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender === 'user' && last.text === textToSend) {
        return prev;
      }
      const userMsg = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      return [...prev.filter(m => m.text?.trim()), userMsg];
    });

    setInputText('');
    setIsTyping(true);
    setMascotState('thinking');

    try {
      const response = await api.askRemo(textToSend, currentLang);
      setIsTyping(false);

      if (response && response.reply && response.reply.trim()) {
        const botMsg = {
          id: 'bot_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          sender: 'remo',
          text: response.reply.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev.filter(m => m.text?.trim()), botMsg]);
        setMascotState(response.mascotState || 'encouraging');
        speakText(response.reply);
      }
      setTimeout(() => setMascotState('idle'), 6000);
    } catch (err) {
      setIsTyping(false);
      setMascotState('concerned');
      setMessages(prev => [
        ...prev.filter(m => m.text?.trim()),
        {
          id: 'bot_err_' + Date.now(),
          sender: 'remo',
          text: 'I am here to support your therapy. Please make sure your hand is visible to the camera for optimal tracking.',
          timestamp: 'Just now'
        }
      ]);
    }
  };

  const quickReplies = [
    'How do I do Squeeze & Fill?',
    'Connect VR Headset',
    'Explain my daily recovery goals',
    'I feel mild fatigue in my hand'
  ];

  return (
    <>
      {/* Floating Mascot Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-6 right-6 z-40 group flex items-center space-x-3 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 p-2.5 rounded-full shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105"
          title="Open Remo Assistant"
        >
          {/* High-Tech Clinical AI Companion Icon (No Emojis or Cartoon Faces) */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <defs>
                <linearGradient id="dropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              {/* Sleek Teardrop Body */}
              <path
                d="M50 15 C50 15 20 52 20 70 A30 30 0 0 0 80 70 C80 52 50 15 50 15 Z"
                fill="url(#dropGrad)"
                className="animate-pulse-slow"
              />
              {/* Medical Kinematics Pulse Waveform (Replaces Cartoon Face) */}
              <path
                d="M32 68 L41 68 L45 56 L51 76 L56 62 L60 68 L68 68"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </div>
          <div className="hidden sm:block text-left pr-2">
            <div className="text-xs font-bold text-white flex items-center space-x-1">
              <span>Remo Assistant</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-[10px] text-cyan-300 font-mono">Clinical AI Companion</div>
          </div>
        </button>
      )}

      {/* Main Remo Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full sm:w-96 max-w-[calc(100vw-2rem)] bg-[#0c1322] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl animate-fadeIn">
          {/* Top Bar with Mascot and Controls */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mini Clinical AI Icon */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path
                    d="M50 15 C50 15 20 52 20 70 A30 30 0 0 0 80 70 C80 52 50 15 50 15 Z"
                    fill="#06b6d4"
                  />
                  <path
                    d="M32 68 L41 68 L45 56 L51 76 L56 62 L60 68 L68 68"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>Remo Companion</span>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800">
                    {mascotState}
                  </span>
                </h4>
                <div className="text-[10px] text-slate-400">Offline Healthcare FAQ & Guidance</div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
                className={`p-1.5 rounded-lg text-xs ${isSpeakingEnabled ? 'text-cyan-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'}`}
                title={isSpeakingEnabled ? 'Speech Output Enabled' : 'Speech Muted'}
              >
                {isSpeakingEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Language Selector Bar */}
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>Language:</span>
            </span>
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value)}
              className="bg-slate-900 text-cyan-300 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-400"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native} ({lang.label})
                </option>
              ))}
            </select>
          </div>

          {/* Safety Disclaimer Strip */}
          <div className="px-4 py-1.5 bg-cyan-950/20 border-b border-cyan-900/30 flex items-center space-x-2 text-[10px] text-cyan-300">
            <ShieldAlert className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Remo is a rehabilitation guide. For acute pain, cease therapy immediately.</span>
          </div>

          {/* Chat Messages Body */}
          <div className="p-4 overflow-y-auto max-h-80 min-h-[220px] space-y-3 text-xs">
            {messages.filter(m => m.text && m.text.trim()).map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-1.5 bg-slate-900 p-2.5 rounded-2xl w-20 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Reply Pills */}
          <div className="px-4 py-2 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none bg-slate-950/50">
            {quickReplies.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-slate-300 hover:text-cyan-300 transition-all shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
              title={isListening ? 'Stop Listening' : 'Speak into Microphone'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Remo a rehabilitation question..."
              className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-400"
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
