import React, { useState, useEffect } from 'react';
import {
  Headset, Wifi, WifiOff, Laptop, CheckCircle2, AlertTriangle,
  RotateCw, ExternalLink, ShieldCheck, Cpu, Eye, Hand, Sparkles, X, Info
} from 'lucide-react';
import { webxrService } from '../services/webxr';

export default function DeviceManager({ onClose }) {
  const [selectedTarget, setSelectedTarget] = useState('auto'); // 'auto', 'quest', 'pico', 'desktop'
  const [xrState, setXrState] = useState(webxrService.getStatus());
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [protocolSecure, setProtocolSecure] = useState(window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    const unsub = webxrService.subscribe((status) => {
      setXrState(status);
    });
    return () => unsub();
  }, []);

  const handleCheckCompatibility = async () => {
    setIsChecking(true);
    setErrorMsg(null);
    try {
      await webxrService.checkSupport();
    } catch (err) {
      setErrorMsg(err.message || 'Capability detection failed');
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnectVR = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      if (!('xr' in navigator)) {
        throw new Error('WebXR Device API is not available in this browser. To connect physical hardware, please launch this site inside Meta Quest Browser or PICO Browser over HTTPS.');
      }
      await webxrService.requestImmersiveSession();
    } catch (err) {
      setErrorMsg(err.message || 'Could not initiate WebXR immersive session. Ensure your headset is connected and awake.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await webxrService.endSession();
    webxrService.stopDesktopSimulation();
  };

  const handleStartDesktopSim = () => {
    webxrService.startDesktopSimulation();
    setErrorMsg(null);
  };

  return (
    <div className="bg-[#0b1222] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-4xl w-full mx-auto shadow-2xl relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
            <Headset className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                Headset & WebXR Device Manager
              </h2>
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-800 font-bold">
                Standards-Based WebXR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Runtime capability verification for Meta Quest 3, Quest 3S, PICO 4 Ultra, and Desktop Simulation.
            </p>
          </div>
        </div>
      </div>

      {/* Target Device Selector */}
      <div className="mt-6 mb-8">
        <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2 font-bold">
          Target Hardware Profile:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'auto', name: 'Auto-Detect', sub: 'Standard WebXR' },
            { id: 'quest', name: 'Meta Quest 3/3S', sub: 'Quest Browser' },
            { id: 'pico', name: 'PICO 4 Ultra', sub: 'PICO Browser' },
            { id: 'desktop', name: 'Desktop Mode', sub: 'Mouse + Webcam' }
          ].map(dev => (
            <button
              key={dev.id}
              onClick={() => setSelectedTarget(dev.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                selectedTarget === dev.id
                  ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs text-white">{dev.name}</div>
              <div className="text-[10px] text-cyan-300 font-mono mt-0.5">{dev.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real Hardware Status Panel */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`w-3.5 h-3.5 rounded-full ${
              xrState.isConnected
                ? 'bg-emerald-400 animate-pulse'
                : xrState.isSimulation
                ? 'bg-amber-400'
                : 'bg-slate-600'
            }`} />
            <div>
              <div className="text-sm font-bold text-white">
                {xrState.isConnected
                  ? 'Active WebXR Immersive Session Connected'
                  : xrState.isSimulation
                  ? 'Desktop Demonstration Mode Active'
                  : 'Physical Headset: Disconnected'}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {xrState.statusLabel}
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckCompatibility}
            disabled={isChecking}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-mono"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check APIs</span>
          </button>
        </div>

        {/* Runtime Diagnostics Table */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase">Browser WebXR</span>
            <span className={`font-bold mt-0.5 block ${
              typeof navigator !== 'undefined' && 'xr' in navigator ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {typeof navigator !== 'undefined' && 'xr' in navigator ? 'Supported (`navigator.xr`)' : 'Not Detected in Browser'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase">Transport Security</span>
            <span className={`font-bold mt-0.5 block ${
              protocolSecure ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {protocolSecure ? 'Secure Context (HTTPS/Local)' : 'Insecure (HTTPS Required)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block uppercase">Hand Tracking API</span>
            <span className="font-bold mt-0.5 block text-cyan-300">
              {xrState.isConnected ? '6-DoF Hand API Active' : 'Available upon Session Start'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Hardware Connection Instructions Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center space-x-2 font-bold text-cyan-400 mb-2">
            <Headset className="w-4 h-4" />
            <span>Meta Quest 3 & Quest 3S Pairing:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
            <li>Power on your Meta Quest 3 or Quest 3S headset.</li>
            <li>Open the built-in <strong>Meta Quest Browser</strong>.</li>
            <li>Type this workstation's URL into the browser bar.</li>
            <li>Click <strong>Enter VR</strong> below to trigger the WebXR session.</li>
          </ol>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center space-x-2 font-bold text-blue-400 mb-2">
            <Cpu className="w-4 h-4" />
            <span>PICO 4 Ultra Setup:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
            <li>Launch <strong>PICO Browser</strong> inside your PICO 4 Ultra headset.</li>
            <li>Confirm the URL is loaded via <strong>HTTPS</strong>.</li>
            <li>Accept immersive WebXR spatial tracking permissions when prompted.</li>
            <li>Telemetry streams to the therapist dashboard in real time.</li>
          </ol>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800">
        {!xrState.isConnected && !xrState.isSimulation ? (
          <>
            <button
              onClick={handleConnectVR}
              disabled={isConnecting}
              className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Requesting WebXR Session...</span>
                </>
              ) : (
                <>
                  <Headset className="w-4 h-4" />
                  <span>Connect / Enter VR (WebXR)</span>
                </>
              )}
            </button>

            <button
              onClick={handleStartDesktopSim}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>Launch Desktop Simulation</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleDisconnect}
            className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 font-bold text-xs transition-all flex items-center justify-center space-x-2"
          >
            <WifiOff className="w-4 h-4" />
            <span>Disconnect Session</span>
          </button>
        )}
      </div>
    </div>
  );
}
