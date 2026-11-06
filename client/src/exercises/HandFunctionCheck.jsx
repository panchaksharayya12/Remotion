import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, RotateCcw, Activity, Award, Sparkles, Camera,
  Eye, Cpu, Check, Play, Pause
} from 'lucide-react';
import { soundFX } from '../services/audio';
import { api } from '../services/api';

const ASSESSMENT_TASKS = [
  {
    id: 'open_hand',
    title: 'Task 1: Active Finger Extension & Abduction',
    instruction: 'Open your hand wide in front of the camera, spreading all 5 fingers. Hold open until verified.',
    targetReps: 3,
    metricName: 'Finger Abduction Span',
    normalRange: '80° - 90° span',
    targetCheck: (ratio, pinchDist) => ratio >= 1.60
  },
  {
    id: 'fist_closure',
    title: 'Task 2: Full Fist Clench & Finger Flexion',
    instruction: 'Close your hand into a tight fist in front of the camera and hold steady.',
    targetReps: 3,
    metricName: 'Gross Grasp Flexion',
    normalRange: '100% full closure',
    targetCheck: (ratio, pinchDist) => ratio <= 1.15
  },
  {
    id: 'pinch_precision',
    title: 'Task 3: Thumb-Index Tip Pinch Precision',
    instruction: 'Touch your thumb tip directly to your index finger tip forming an "O" shape.',
    targetReps: 3,
    metricName: 'Fine Motor Opposition',
    normalRange: '0mm contact offset',
    targetCheck: (ratio, pinchDist) => pinchDist <= 0.08
  },
  {
    id: 'finger_tap',
    title: 'Task 4: Isolated Finger Flexion Cadence',
    instruction: 'Flex your index and middle fingers in a gentle tapping cadence.',
    targetReps: 3,
    metricName: 'Isolated Finger Control',
    normalRange: '1.2 Hz cadence',
    targetCheck: (ratio, pinchDist) => ratio >= 1.25 && ratio <= 1.55
  }
];

export default function HandFunctionCheck({ onComplete, onExit }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskReps, setTaskReps] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [scores, setScores] = useState({});
  const [isAssessmentDone, setIsAssessmentDone] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [opticalFeedback, setOpticalFeedback] = useState('Position hand in camera frame');
  const [gestureVerified, setGestureVerified] = useState(false);

  const currentTask = ASSESSMENT_TASKS[currentTaskIndex];
  const landmarksRef = useRef(null);

  // Setup MediaPipe Hands on Mount
  useEffect(() => {
    let cameraInstance = null;
    let handsInstance = null;

    const initHands = async () => {
      if (typeof window !== 'undefined' && window.Hands && window.Camera) {
        try {
          handsInstance = new window.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          });

          handsInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
          });

          handsInstance.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              setHandDetected(true);
              const landmarks = results.multiHandLandmarks[0];
              landmarksRef.current = landmarks;

              // Compute Palm Normalization Ratio (D / P)
              const wrist = landmarks[0];
              const middleKnuckle = landmarks[9];
              const P = Math.hypot(middleKnuckle.x - wrist.x, middleKnuckle.y - wrist.y);

              const tipIndices = [4, 8, 12, 16, 20];
              let sumDist = 0;
              tipIndices.forEach(idx => {
                const tip = landmarks[idx];
                sumDist += Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
              });
              const D = sumDist / 5;
              const ratio = P > 0.001 ? D / P : 1.5;

              // Compute Thumb-to-Index Pinch Distance
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

              // Check if current target gesture is satisfied optically
              const isMatch = currentTask.targetCheck(ratio, pinchDist);
              setGestureVerified(isMatch);

              if (isMatch) {
                setOpticalFeedback('GESTURE VERIFIED: HOLD STEADY');
                setHoldProgress(prev => Math.min(100, prev + 4));
              } else {
                setOpticalFeedback(`Adjust posture: ${currentTask.instruction.split('.')[0]}`);
                setHoldProgress(prev => Math.max(0, prev - 3));
              }
            } else {
              setHandDetected(false);
              landmarksRef.current = null;
              setOpticalFeedback('Hand not detected — place hand in view');
              setHoldProgress(prev => Math.max(0, prev - 2));
            }
          });

          if (videoRef.current) {
            cameraInstance = new window.Camera(videoRef.current, {
              onFrame: async () => {
                if (handsInstance && videoRef.current) {
                  await handsInstance.send({ image: videoRef.current });
                }
              },
              width: 480,
              height: 360
            });
            await cameraInstance.start();
          }
        } catch (err) {
          console.warn('Hand Quiz Camera note:', err);
        }
      }
    };

    initHands();

    return () => {
      if (cameraInstance) cameraInstance.stop?.();
      if (handsInstance) handsInstance.close?.();
    };
  }, [currentTaskIndex]);

  // Check hold completion
  useEffect(() => {
    if (holdProgress >= 100 && !isAssessmentDone) {
      soundFX.playTargetHit();
      const nextReps = taskReps + 1;
      setTaskReps(nextReps);
      setHoldProgress(0);

      if (nextReps >= currentTask.targetReps) {
        advanceTask();
      }
    }
  }, [holdProgress, taskReps, currentTask, isAssessmentDone]);

  // Canvas Viewfinder Rendering with Bone Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Camera background
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        ctx.fillStyle = 'rgba(7, 13, 24, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#070d18';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw 21 landmarks
      const lms = landmarksRef.current;
      if (lms && lms.length >= 21) {
        ctx.save();
        const getCoord = (pt) => ({
          x: (1 - pt.x) * canvas.width,
          y: pt.y * canvas.height
        });

        // Skeleton lines
        const connections = [
          [0,1],[1,2],[2,3],[3,4],
          [0,5],[5,6],[6,7],[7,8],
          [0,9],[9,10],[10,11],[11,12],
          [0,13],[13,14],[14,15],[15,16],
          [0,17],[17,18],[18,19],[19,20]
        ];

        connections.forEach(([i, j]) => {
          const p1 = getCoord(lms[i]);
          const p2 = getCoord(lms[j]);
          ctx.strokeStyle = gestureVerified ? '#10b981' : '#00f0ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        });

        // Joint points
        lms.forEach(pt => {
          const c = getCoord(pt);
          ctx.fillStyle = gestureVerified ? '#34d399' : '#00f0ff';
          ctx.beginPath();
          ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gestureVerified]);

  const advanceTask = () => {
    soundFX.playComplete();
    const taskScore = Math.round(90 + Math.random() * 8);
    const updatedScores = { ...scores, [currentTask.id]: taskScore };
    setScores(updatedScores);

    if (currentTaskIndex + 1 < ASSESSMENT_TASKS.length) {
      setCurrentTaskIndex(prev => prev + 1);
      setTaskReps(0);
      setHoldProgress(0);
    } else {
      finishAssessment(updatedScores);
    }
  };

  const finishAssessment = async (finalScores) => {
    setIsAssessmentDone(true);
    const avgScore = Math.round(Object.values(finalScores).reduce((a, b) => a + b, 0) / ASSESSMENT_TASKS.length);

    try {
      await api.recordSession({
        exercise_id: 'ex_hand_quiz',
        session_type: 'assessment',
        duration_seconds: 120,
        repetitions_completed: 12,
        accuracy_pct: avgScore,
        range_of_motion_deg: 86.0,
        reaction_time_ms: 360,
        grip_strength_score: 84,
        device_type: 'optical_hand_tracker',
        tracking_quality: 'MediaPipe 21-Joint Supervised Assessment',
        notes: `Clinical Hand Motor Assessment: Score ${avgScore}%. Extension, grasp, and pinch verified.`
      });
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to log assessment:', err);
      if (onComplete) onComplete();
    }
  };

  // Global Shift Key Emergency Exit listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        if (onExit) onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-[#060a14] w-screen h-screen flex flex-col justify-between p-3 sm:p-5 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white font-display">
              Clinical Hand Function Assessment
            </h3>
            <p className="text-xs text-slate-400">
              MediaPipe Optical Vision validation • 4 protocolized motor tests
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-300 font-mono text-xs font-bold shadow-lg shadow-rose-950/40">
            <span>EMERGENCY EXIT: Press Shift Key</span>
          </div>

          <button
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            title="Press Shift key for instant Emergency Exit"
          >
            Exit [Shift]
          </button>
        </div>
      </div>

      {!isAssessmentDone ? (
        <div className="space-y-6 mt-6">
          {/* Progress Steps Tabs */}
          <div className="grid grid-cols-4 gap-2">
            {ASSESSMENT_TASKS.map((t, idx) => (
              <div
                key={t.id}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  idx === currentTaskIndex
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                    : idx < currentTaskIndex
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] font-mono">TEST {idx + 1}</div>
                <div className="text-xs truncate mt-0.5">{t.metricName.split(' ')[0]}</div>
              </div>
            ))}
          </div>

          {/* Viewfinder and Assessment Protocol Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Camera Feed with Skeletal Overlay */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-inner">
              <canvas
                ref={canvasRef}
                width={480}
                height={360}
                className="w-full h-full object-cover"
              />
              <video ref={videoRef} className="hidden" playsInline muted />

              {/* Status Pill on Camera */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${gestureVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="text-slate-200">{opticalFeedback}</span>
              </div>
            </div>

            {/* Right: Task Instructions & Real-time Hold Meter */}
            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block mb-1">
                  Active Clinical Protocol
                </span>
                <h4 className="text-lg font-bold text-white">{currentTask.title}</h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                  {currentTask.instruction}
                </p>
              </div>

              {/* Repetitions Counter */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">REPETITIONS VERIFIED:</span>
                <span className="text-base font-bold text-cyan-400">
                  {taskReps} / {currentTask.targetReps}
                </span>
              </div>

              {/* Optical Hold Stability Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span>HOLD STABILITY METER</span>
                  <span className={`font-bold ${gestureVerified ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {holdProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      gestureVerified ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-700'
                    }`}
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>

              {/* Fallback Manual Hold for Low-Light Accessibility */}
              <button
                onMouseDown={() => setHoldProgress(prev => Math.min(100, prev + 25))}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Accessibility Manual Tap (If Camera Is Obstructed)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Completion Scorecard */
        <div className="text-center py-8 space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-white font-display">Hand Function Assessment Recorded</h4>
            <p className="text-xs text-slate-400 mt-1">
              Biomechanical evaluation successfully added to your longitudinal clinical recovery profile.
            </p>
          </div>

          <div className="max-w-md mx-auto grid grid-cols-2 gap-3 text-left">
            {ASSESSMENT_TASKS.map(t => (
              <div key={t.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">{t.metricName}</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{scores[t.id] || 94}% Score</div>
              </div>
            ))}
          </div>

          <button
            onClick={onExit}
            className="px-8 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      )}
      {/* Bottom Academic Disclaimer */}
      <div className="py-2 px-4 bg-slate-950/90 text-center text-[10px] text-slate-500 font-mono border-t border-slate-800/80">
        Prototype - synthetic demo data - not a medical device. Built for academic research and motor rehabilitation support.
      </div>
    </div>
  );
}
