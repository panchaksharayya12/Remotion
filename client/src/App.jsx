import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SignInPage from './portals/SignInPage';
import RegisterPage from './portals/RegisterPage';
import PatientPortal from './portals/PatientPortal';
import TherapistPortal from './portals/TherapistPortal';
import AdminPortal from './portals/AdminPortal';
import GamingPortal from './portals/GamingPortal';
import HeadsetModal from './components/HeadsetModal';
import { api } from './services/api';
import { ShieldCheck, Eye, ArrowLeft, LogOut } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPortal, setCurrentPortal] = useState('signin'); // 'signin', 'register', 'patient', 'therapist', 'admin', 'explorer'
  const [previewMode, setPreviewMode] = useState(null); // When admin previews other portals
  const [isHeadsetOpen, setIsHeadsetOpen] = useState(false);
  const [headsetStatus, setHeadsetStatus] = useState({
    isConnected: false,
    deviceName: 'Disconnected'
  });

  // Check stored auth session on mount
  useEffect(() => {
    if (api.user && api.token) {
      setCurrentUser(api.user);
      routeByRole(api.user.role);
    } else {
      setCurrentPortal('signin');
    }
  }, []);

  const routeByRole = (role) => {
    if (role === 'patient') setCurrentPortal('patient');
    else if (role === 'therapist') setCurrentPortal('therapist');
    else if (role === 'admin') setCurrentPortal('admin');
    else setCurrentPortal('explorer');
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setPreviewMode(null);
    routeByRole(user.role);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setPreviewMode(null);
    setCurrentPortal('signin');
  };

  // Safe navigation with Role-Based Route Protection
  const handleNavigatePortal = (targetPortal) => {
    if (!currentUser) {
      setCurrentPortal('signin');
      return;
    }

    // Admins can navigate anywhere via Preview Mode
    if (currentUser.role === 'admin') {
      if (targetPortal !== 'admin') {
        setPreviewMode(targetPortal);
      } else {
        setPreviewMode(null);
      }
      setCurrentPortal(targetPortal);
      return;
    }

    // Role-protected guardrails: Patients can ONLY view patient or explorer
    if (currentUser.role === 'patient') {
      if (targetPortal === 'patient' || targetPortal === 'explorer') {
        setCurrentPortal(targetPortal);
      } else {
        alert('Access Restricted: Clinical administrative workspaces require verified clinical or administrative credentials.');
      }
      return;
    }

    // Therapists can view therapist or explorer
    if (currentUser.role === 'therapist') {
      if (targetPortal === 'therapist' || targetPortal === 'explorer') {
        setCurrentPortal(targetPortal);
      } else {
        alert('Access Restricted: Hospital administration console requires system superuser credentials.');
      }
      return;
    }

    // Explorer accounts can only view explorer
    if (currentUser.role === 'explorer') {
      setCurrentPortal('explorer');
    }
  };

  // If unauthenticated: render SignInPage or RegisterPage
  if (!currentUser) {
    if (currentPortal === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={handleAuthSuccess}
          onNavigateSignIn={() => setCurrentPortal('signin')}
        />
      );
    }
    return (
      <SignInPage
        onAuthSuccess={handleAuthSuccess}
        onNavigateRegister={() => setCurrentPortal('register')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Admin Preview Mode Alert Banner */}
      {previewMode && currentUser?.role === 'admin' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-2">
            <span className="uppercase tracking-wider font-mono bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px]">
              PREVIEW MODE
            </span>
            <span>You are previewing the {currentPortal.toUpperCase()} portal as System Administrator.</span>
          </div>
          <button
            onClick={() => {
              setPreviewMode(null);
              setCurrentPortal('admin');
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Console</span>
          </button>
        </div>
      )}

      {/* Main Top Navigation Bar */}
      <Navbar
        currentPortal={currentPortal}
        setCurrentPortal={handleNavigatePortal}
        currentUser={currentUser}
        onOpenAuth={() => {}}
        onOpenHeadsetModal={() => setIsHeadsetOpen(true)}
        headsetStatus={headsetStatus}
        onLogout={handleLogout}
      />

      {/* Main Portal View Routing */}
      <main className="flex-1 w-full">
        {currentPortal === 'patient' && (
          <PatientPortal
            currentUser={currentUser}
            onNavigateGaming={() => setCurrentPortal('explorer')}
          />
        )}

        {currentPortal === 'therapist' && (
          <TherapistPortal
            currentUser={currentUser}
            onOpenHeadsetModal={() => setIsHeadsetOpen(true)}
          />
        )}

        {currentPortal === 'admin' && (
          <AdminPortal
            onPreviewPortal={(portal) => {
              setPreviewMode(portal);
              setCurrentPortal(portal);
            }}
          />
        )}

        {(currentPortal === 'explorer' || currentPortal === 'gaming') && (
          <GamingPortal
            onOpenHeadsetModal={() => setIsHeadsetOpen(true)}
          />
        )}
      </main>

      {/* Permanent Academic Disclaimer Footer across all authenticated portals */}
      <footer className="w-full bg-slate-950/90 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-500/70" />
            <span>Prototype - synthetic demo data - not a medical device. Built for academic research and motor rehabilitation support.</span>
          </div>
          <div className="text-[11px] text-slate-600">
            ReMotion AR/VR XR2 • Multi-Portal Platform
          </div>
        </div>
      </footer>

      {/* Headset & WebXR Device Modal */}
      <HeadsetModal
        isOpen={isHeadsetOpen}
        onClose={() => setIsHeadsetOpen(false)}
        onConnectionChange={(status) => setHeadsetStatus(status)}
      />
    </div>
  );
}
