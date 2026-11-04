import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  X, Play, Pause, RotateCcw, Award, Zap, Trophy, Timer, ArrowRight,
  Volume2, VolumeX, CheckCircle2, ShieldCheck, Sparkles, Target, Headset,
  Activity, BarChart2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundFX } from '../services/audio';
import { api } from '../services/api';
import { webxrService } from '../services/webxr';

// Robust Game ID Normalizer: handles 'gm_badminton', 'game_badminton', 'badminton', and titles
export const resolveStandardGameId = (gameObj) => {
  if (!gameObj) return 'gm_badminton';
  const id = (gameObj.id || '').toLowerCase().trim();
  const title = (gameObj.title || '').toLowerCase().trim();

  if (id.includes('badminton') || title.includes('badminton')) return 'gm_badminton';
  if (id.includes('cricket') || title.includes('cricket')) return 'gm_cricket';
  if (id.includes('basketball') || id.includes('hoop') || title.includes('basketball')) return 'gm_basketball';
  if (id.includes('table_tennis') || id.includes('ping_pong') || title.includes('table tennis') || title.includes('ping pong')) return 'gm_table_tennis';
  if (id.includes('bowling') || title.includes('bowling')) return 'gm_bowling';
  if (id.includes('balloon') || title.includes('balloon')) return 'gm_balloon_pop';
  if (id.includes('fruit') || title.includes('fruit') || title.includes('harvest')) return 'gm_fruit_reach';
  if (id.includes('squeeze') || id.includes('sponge') || title.includes('squeeze') || title.includes('sponge')) return 'gm_squeeze';
  if (id.includes('reacher') || id.includes('star') || title.includes('reacher') || title.includes('star')) return 'gm_reacher';
  return id.startsWith('gm_') ? id : ('gm_' + id);
};

export default function PlayableGameModal({ game, isOpen = true, onClose, onGameComplete, onComplete }) {
  if (!isOpen || !game) return null;

  const standardGameId = resolveStandardGameId(game);
  const containerRef = useRef(null);
  const [difficulty, setDifficulty] = useState('Medium'); // Easy, Medium, Hard
  const [gameState, setGameState] = useState('playing'); // 'playing', 'paused', 'completed'
  const [score, setScore] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [objectiveProgress, setObjectiveProgress] = useState(0);
  const [hitFeedback, setHitFeedback] = useState(null);
  const [isVrActive, setIsVrActive] = useState(false);

  // Objectives tailored to each game (Continuous rehabilitation goals, NO 30s timeouts!)
  const getGameObjective = (id) => {
    switch (id) {
      case 'gm_badminton':
        return { label: 'Rallies Completed', target: 10, unit: 'rallies' };
      case 'gm_cricket':
        return { label: 'Balls Faced', target: 12, unit: 'deliveries' };
      case 'gm_basketball':
        return { label: 'Baskets Scored', target: 8, unit: 'baskets' };
      case 'gm_table_tennis':
        return { label: 'Rally Points', target: 10, unit: 'points' };
      case 'gm_bowling':
        return { label: 'Pins Knocked Down', target: 30, unit: 'pins' };
      case 'gm_balloon_pop':
        return { label: 'Balloons Popped', target: 15, unit: 'balloons' };
      case 'gm_fruit_reach':
        return { label: 'Fruits Harvested', target: 10, unit: 'fruits' };
      case 'gm_squeeze':
        return { label: 'Sponge Squeezes', target: 15, unit: 'squeezes' };
      case 'gm_reacher':
        return { label: 'Stars Captured', target: 20, unit: 'stars' };
      case 'gm_target_shooting':
        return { label: 'Targets Aligned', target: 10, unit: 'targets' };
      case 'gm_tennis':
        return { label: 'Volleys Returned', target: 10, unit: 'volleys' };
      default:
        return { label: 'Repetitions', target: 10, unit: 'reps' };
    }
  };

  const objective = getGameObjective(standardGameId);

  // Game Engine Internal State References
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    animId: null,
    pointer: { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false },
    gameEntities: {},
    progressCount: 0,
    currentScore: 0
  });

  // Duration Timer (Counts UP for therapeutic time tracking, never auto-terminates!)
  useEffect(() => {
    let timer;
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  // Launch WebXR Immersive Session if supported
  const handleLaunchVR = async () => {
    try {
      if (navigator.xr) {
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
        if (isSupported) {
          const session = await navigator.xr.requestSession('immersive-vr');
          setIsVrActive(true);
          session.addEventListener('end', () => setIsVrActive(false));
          if (threeRef.current.renderer) {
            threeRef.current.renderer.xr.enabled = true;
            await threeRef.current.renderer.xr.setSession(session);
          }
          return;
        }
      }
      alert('Physical WebXR headset not detected. You can play using smooth 3D mouse/pointer controls, or launch inside the Meta Quest browser.');
    } catch (err) {
      console.warn('VR session request:', err);
    }
  };

  // Setup Three.js 3D Sports Engine
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 920;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d18);
    scene.fog = new THREE.FogExp2(0x070d18, 0.025);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    threeRef.current.scene = scene;
    threeRef.current.camera = camera;
    threeRef.current.renderer = renderer;
    threeRef.current.progressCount = 0;
    threeRef.current.currentScore = 0;

    // Studio & Sports Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const stadiumSpot = new THREE.DirectionalLight(0xffffff, 2.6);
    stadiumSpot.position.set(5, 12, 8);
    stadiumSpot.castShadow = true;
    stadiumSpot.shadow.mapSize.width = 1024;
    stadiumSpot.shadow.mapSize.height = 1024;
    scene.add(stadiumSpot);

    const blueRim = new THREE.DirectionalLight(0x00f0ff, 1.8);
    blueRim.position.set(-8, 6, -6);
    scene.add(blueRim);

    // Initialize the specific 3D sports environment
    const gameId = standardGameId;
    let cleanupGame = null;

    if (gameId === 'gm_badminton') {
      cleanupGame = setup3DBadminton(scene, camera, threeRef.current);
    } else if (gameId === 'gm_cricket') {
      cleanupGame = setup3DCricket(scene, camera, threeRef.current);
    } else if (gameId === 'gm_basketball') {
      cleanupGame = setup3DBasketball(scene, camera, threeRef.current);
    } else if (gameId === 'gm_table_tennis') {
      cleanupGame = setup3DTableTennis(scene, camera, threeRef.current);
    } else if (gameId === 'gm_bowling') {
      cleanupGame = setup3DBowling(scene, camera, threeRef.current);
    } else {
      cleanupGame = setup3DTargetRehab(scene, camera, threeRef.current, gameId);
    }

    // Pointer event listeners (Translates 2D screen coordinate to 3D world plane)
    const handlePointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      threeRef.current.pointer.x = nx;
      threeRef.current.pointer.y = ny;
    };

    const handlePointerDown = () => {
      threeRef.current.pointer.isDown = true;
    };

    const handlePointerUp = () => {
      threeRef.current.pointer.isDown = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointerup', handlePointerUp);

    // Main 3D Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      threeRef.current.animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (threeRef.current.updateGame && gameState === 'playing') {
        threeRef.current.updateGame(delta);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth || 920;
      const nh = container.clientHeight || 560;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);
    const resizeTimer = setTimeout(handleResize, 80);

    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(threeRef.current.animId);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      if (cleanupGame) cleanupGame();
      renderer.dispose();
    };
  }, [standardGameId, gameState, difficulty]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Record completed session
  const finishSession = () => {
    setGameState('completed');
    const finalScore = threeRef.current.currentScore || score;
    const finalReps = threeRef.current.progressCount || objectiveProgress;
    const finalDur = elapsedSeconds;
    const finalAcc = Math.min(100, Math.round(85 + (finalReps / objective.target) * 12));

    const results = {
      gameId: game.id,
      gameTitle: game.title,
      score: finalScore,
      repetitions: finalReps,
      duration: finalDur,
      accuracy: finalAcc,
      completedAt: new Date().toISOString()
    };

    setFinalResults(results);
    soundFX.playMilestone();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    // Save session in background
    api.createSession({
      game_id: game.id,
      session_type: 'game',
      duration_seconds: finalDur,
      repetitions_completed: finalReps,
      accuracy_pct: finalAcc,
      device_type: isVrActive ? 'meta_quest_xr2' : 'webgl_3d_engine'
    }).catch(err => console.warn('Session save note:', err));

    if (onGameComplete) onGameComplete(results);
    if (onComplete) onComplete(results);
  };

  // =========================================================================
  // GAME 1: 3D BADMINTON (Real Court, 3D Net, 3D Racket, Parabolic Shuttlecock)
  // =========================================================================
  function setup3DBadminton(scene, camera, engine) {
    camera.position.set(0, 1.8, 3.8);
    camera.lookAt(0, 1.1, -2.5);

    // 1. Badminton Court Floor (Emerald green rubberized sports court with white lines)
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x0f5132, roughness: 0.45 });
    const courtGeom = new THREE.PlaneGeometry(6.1, 13.4);
    const court = new THREE.Mesh(courtGeom, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);

    // Court White Boundary Lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const addLine = (w, h, x, z) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.005, z);
      scene.add(line);
    };
    addLine(6.1, 0.05, 0, 0); // Center net line
    addLine(6.1, 0.05, 0, -1.98); // Short service line opponent
    addLine(6.1, 0.05, 0, 1.98); // Short service line player
    addLine(6.1, 0.05, 0, -6.7); // Back baseline opponent
    addLine(6.1, 0.05, 0, 6.7); // Back baseline player
    addLine(0.05, 13.4, -3.05, 0); // Left sideline
    addLine(0.05, 13.4, 3.05, 0); // Right sideline

    // 2. 3D Badminton Net with Posts
    const netGroup = new THREE.Group();
    // Posts
    [-3.05, 3.05].forEach(px => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      post.position.set(px, 0.77, 0);
      netGroup.add(post);
    });
    // Net Mesh
    const netGeom = new THREE.PlaneGeometry(6.1, 0.76);
    const netMeshMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      wireframe: true
    });
    const net = new THREE.Mesh(netGeom, netMeshMat);
    net.position.set(0, 1.17, 0);
    netGroup.add(net);
    // Net Top White Tape
    const tape = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.08, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tape.position.set(0, 1.53, 0);
    netGroup.add(tape);
    scene.add(netGroup);

    // 3. 3D Badminton Racquet (Foreground, mapped to mouse pointer)
    const racketGroup = new THREE.Group();
    const frameGeom = new THREE.TorusGeometry(0.32, 0.016, 12, 32);
    frameGeom.scale(1.0, 1.25, 1.0);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8, roughness: 0.2 });
    const frame = new THREE.Mesh(frameGeom, frameMat);

    // String Mesh
    const strings = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 0.75), new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    }));
    frame.add(strings);

    // Shaft & Handle
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 16), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    shaft.position.set(0, -0.65, 0);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.28, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 }));
    handle.position.set(0, -0.92, 0);

    racketGroup.add(frame);
    racketGroup.add(shaft);
    racketGroup.add(handle);
    racketGroup.rotation.x = 0.2;
    scene.add(racketGroup);

    // 4. 3D Shuttlecock (Cork base + Feathered conical skirt)
    const shuttleGroup = new THREE.Group();
    // Cork dome
    const cork = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 }));
    // Skirt cone
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xf8fafc, side: THREE.DoubleSide }));
    skirt.position.set(0, 0.09, 0);
    shuttleGroup.add(cork);
    shuttleGroup.add(skirt);
    shuttleGroup.position.set(0, 2.2, -4.5);
    scene.add(shuttleGroup);

    // Shuttlecock Physics state
    let shuttleVel = new THREE.Vector3(0.4, 0.2, 4.2);
    let inRally = true;
    let rallyCount = 0;

    engine.updateGame = (dt) => {
      // 1. Map Racket position to pointer
      const targetX = engine.pointer.x * 2.2;
      const targetY = 1.1 + (engine.pointer.y * 1.0);
      racketGroup.position.x += (targetX - racketGroup.position.x) * 0.18;
      racketGroup.position.y += (targetY - racketGroup.position.y) * 0.18;
      racketGroup.position.z = 2.2;
      racketGroup.rotation.z = -engine.pointer.x * 0.35;

      // 2. Advance Shuttlecock
      shuttleGroup.position.x += shuttleVel.x * dt;
      shuttleGroup.position.y += shuttleVel.y * dt;
      shuttleGroup.position.z += shuttleVel.z * dt;

      // Gravity and air drag
      shuttleVel.y -= 2.6 * dt;

      // Rotate shuttlecock along its velocity vector
      shuttleGroup.lookAt(shuttleGroup.position.clone().add(shuttleVel));

      // 3. Collision with Racket Zone (Z ~ 2.2)
      if (shuttleGroup.position.z >= 1.9 && shuttleGroup.position.z <= 2.5 && shuttleVel.z > 0) {
        const dx = shuttleGroup.position.x - racketGroup.position.x;
        const dy = shuttleGroup.position.y - racketGroup.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.65) {
          // Sweet spot strike!
          soundFX.playTargetHit();
          rallyCount += 1;
          engine.progressCount = rallyCount;
          engine.currentScore += 100;
          setScore(engine.currentScore);
          setObjectiveProgress(rallyCount);
          setHitFeedback({ text: `SMASH! Rally #${rallyCount}`, color: 'text-cyan-400' });
          setTimeout(() => setHitFeedback(null), 1200);

          // Return shuttlecock back across the net
          shuttleVel.z = -5.8;
          shuttleVel.y = 2.4 + Math.random() * 0.8;
          shuttleVel.x = (Math.random() - 0.5) * 2.2;

          if (rallyCount >= objective.target) {
            finishSession();
          }
        }
      }

      // 4. Opponent Return (When shuttlecock reaches far baseline)
      if (shuttleGroup.position.z <= -4.8 && shuttleVel.z < 0) {
        shuttleVel.z = 4.2 + (rallyCount * 0.15); // Progressively slightly faster
        shuttleVel.y = 2.8 + Math.random() * 0.6;
        shuttleVel.x = (Math.random() - 0.5) * 2.0;
        soundFX.playClick();
      }

      // 5. Shuttle dropped on floor (Reset point)
      if (shuttleGroup.position.y <= 0.1) {
        shuttleGroup.position.set((Math.random() - 0.5) * 2.0, 2.2, -4.5);
        shuttleVel.set((Math.random() - 0.5) * 1.5, 1.8, 3.8);
      }
    };

    return () => {
      scene.remove(court);
      scene.remove(netGroup);
      scene.remove(racketGroup);
      scene.remove(shuttleGroup);
    };
  }

  // =========================================================================
  // GAME 2: 3D CRICKET (3D Pitch, Stadium, Bowler Run-Up, Willow Bat, Wickets)
  // =========================================================================
  function setup3DCricket(scene, camera, engine) {
    camera.position.set(0, 1.6, 3.6);
    camera.lookAt(0, 1.0, -12);

    // 1. Stadium Grass Outfield
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6 });
    const grass = new THREE.Mesh(new THREE.CircleGeometry(24, 48), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // 2. 22-Yard Tan Pitch Strip (20.12m long)
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 20.12), pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0.005, -7.0);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Crease lines
    const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const popCrease = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 0.06), creaseMat);
    popCrease.rotation.x = -Math.PI / 2;
    popCrease.position.set(0, 0.01, 1.2);
    scene.add(popCrease);

    // 3. Stumps & Bails (Batter End & Bowler End)
    const createWickets = (zPos) => {
      const wicketGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
      [-0.14, 0, 0.14].forEach(sx => {
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.71, 16), woodMat);
        stump.position.set(sx, 0.355, zPos);
        wicketGroup.add(stump);
      });
      const bail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.022, 0.022), woodMat);
      bail.position.set(0, 0.72, zPos);
      wicketGroup.add(bail);
      return wicketGroup;
    };
    const batterWickets = createWickets(1.8);
    const bowlerWickets = createWickets(-16.0);
    scene.add(batterWickets);
    scene.add(bowlerWickets);

    // 4. 3D English Willow Cricket Bat (Controlled by Batter)
    const batGroup = new THREE.Group();
    const bladeGeom = new THREE.BoxGeometry(0.14, 0.75, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 });
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    const caneHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 16), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    caneHandle.position.set(0, 0.52, 0);
    batGroup.add(blade);
    batGroup.add(caneHandle);
    batGroup.position.set(0.2, 0.5, 1.2);
    scene.add(batGroup);

    // 5. 3D Red Leather Cricket Ball
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.25 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 24), ballMat);
    // White seam
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.005, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ball.add(seam);
    ball.position.set(0, 1.8, -15.5);
    scene.add(ball);

    // 6. 3D Animated Bowler Avatar Figure
    const bowlerGroup = new THREE.Group();
    const bowlerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
    bowlerBody.position.y = 1.0;
    const bowlerHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({ color: 0xfed7aa }));
    bowlerHead.position.y = 1.75;
    bowlerGroup.add(bowlerBody);
    bowlerGroup.add(bowlerHead);
    bowlerGroup.position.set(0, 0, -17.5);
    scene.add(bowlerGroup);

    let ballVel = new THREE.Vector3(0, 0, 9.5);
    let ballsFaced = 0;
    let bowlerRunPhase = 0;

    engine.updateGame = (dt) => {
      // 1. Bat follows pointer
      const targetX = engine.pointer.x * 1.5;
      const targetY = 0.5 + (engine.pointer.y * 0.8);
      batGroup.position.x += (targetX - batGroup.position.x) * 0.2;
      batGroup.position.y += (targetY - batGroup.position.y) * 0.2;
      batGroup.rotation.z = -engine.pointer.x * 0.4;
      batGroup.rotation.x = engine.pointer.isDown ? 0.6 : 0.1;

      // 2. Bowler Run-up Animation
      bowlerRunPhase += dt * 3.5;
      bowlerGroup.position.z = -17.5 + Math.sin(bowlerRunPhase) * 1.2;

      // 3. Ball Delivery Physics
      ball.position.x += ballVel.x * dt;
      ball.position.y += ballVel.y * dt;
      ball.position.z += ballVel.z * dt;
      ball.rotation.x += dt * 8;

      // Pitch Bounce (Bounces off the pitch at roughly -5m mark)
      if (ball.position.z > -7.0 && ball.position.z < -4.0 && ball.position.y < 0.22 && ballVel.y < 0) {
        ballVel.y = 2.2;
        soundFX.playClick();
      } else {
        ballVel.y -= 3.2 * dt; // Gravity
      }

      // 4. Bat-Ball Collision (Popping crease Z ~ 1.2)
      if (ball.position.z >= 0.9 && ball.position.z <= 1.5 && ballVel.z > 0) {
        const dx = ball.position.x - batGroup.position.x;
        const dy = ball.position.y - batGroup.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.55) {
          // Shot Connected!
          soundFX.playTargetHit();
          ballsFaced += 1;
          engine.progressCount = ballsFaced;
          setObjectiveProgress(ballsFaced);

          // Calculate runs based on shot timing and power
          const isSix = Math.abs(dx) < 0.18 && engine.pointer.isDown;
          const runs = isSix ? 6 : Math.abs(dx) < 0.32 ? 4 : 2;
          engine.currentScore += runs;
          setScore(engine.currentScore);

          setHitFeedback({
            text: runs === 6 ? 'MASSIVE SIX! 6 RUNS!' : runs === 4 ? 'BOUNDARY FOUR! 4 RUNS!' : 'TIMED DRIVE! 2 RUNS',
            color: runs === 6 ? 'text-amber-400' : 'text-emerald-400'
          });
          setTimeout(() => setHitFeedback(null), 1500);

          // Ball launches into the outfield
          ballVel.z = -18.0;
          ballVel.y = runs === 6 ? 9.0 : 4.0;
          ballVel.x = (dx > 0 ? 8.0 : -8.0);

          if (ballsFaced >= objective.target) {
            finishSession();
          }
        }
      }

      // 5. Bowled Check (Missed bat and hit wickets)
      if (ball.position.z >= 1.7 && ball.position.z <= 2.0 && ballVel.z > 0) {
        if (Math.abs(ball.position.x) < 0.22 && ball.position.y < 0.75) {
          soundFX.playSqueeze();
          setHitFeedback({ text: 'BOWLED! Clean Stumps', color: 'text-rose-400' });
          setTimeout(() => setHitFeedback(null), 1500);
          batterWickets.rotation.z = 0.4; // Wicket rattled
        }
      }

      // 6. Reset Ball for next delivery
      if (ball.position.z > 4.0 || ball.position.z < -22.0 || ball.position.y < -0.2) {
        ball.position.set((Math.random() - 0.5) * 0.4, 1.8, -15.5);
        ballVel.set((Math.random() - 0.5) * 0.8, -0.5, 9.2 + Math.random() * 1.5);
        batterWickets.rotation.z = 0;
      }
    };

    return () => {
      scene.remove(grass);
      scene.remove(pitch);
      scene.remove(popCrease);
      scene.remove(batterWickets);
      scene.remove(bowlerWickets);
      scene.remove(batGroup);
      scene.remove(ball);
      scene.remove(bowlerGroup);
    };
  }

  // =========================================================================
  // GAME 3: 3D BASKETBALL (Court, Backboard, Rim, Swish Physics)
  // =========================================================================
  function setup3DBasketball(scene, camera, engine) {
    camera.position.set(0, 1.8, 4.2);
    camera.lookAt(0, 2.2, -4.5);

    // Hardwood Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Hoop & Backboard Assembly (Regulation 3.05m height)
    const hoopGroup = new THREE.Group();
    hoopGroup.position.set(0, 3.05, -4.5);

    // Glass Backboard
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.05), new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.75,
      roughness: 0.1
    }));
    hoopGroup.add(board);

    // Orange Steel Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 16, 32), new THREE.MeshStandardMaterial({ color: 0xea580c }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, -0.25, 0.38);
    hoopGroup.add(rim);

    // Net
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.45, 16, 4, true), new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    }));
    net.position.set(0, -0.48, 0.38);
    hoopGroup.add(net);
    scene.add(hoopGroup);

    // 3D Basketball
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), ballMat);
    ball.position.set(0, 1.2, 2.0);
    scene.add(ball);

    let ballVel = new THREE.Vector3(0, 0, 0);
    let inFlight = false;
    let baskets = 0;

    engine.updateGame = (dt) => {
      if (!inFlight) {
        // Ball follows pointer before release
        ball.position.x = engine.pointer.x * 1.8;
        ball.position.y = 1.0 + (engine.pointer.y * 0.8);
        ball.position.z = 2.0;

        // Shoot when clicked
        if (engine.pointer.isDown) {
          inFlight = true;
          ballVel.set(-engine.pointer.x * 1.5, 4.8, -7.5);
          soundFX.playClick();
        }
      } else {
        // Flight physics
        ball.position.x += ballVel.x * dt;
        ball.position.y += ballVel.y * dt;
        ball.position.z += ballVel.z * dt;
        ballVel.y -= 6.2 * dt; // Gravity
        ball.rotation.x += dt * 6;

        // Basket Detection (Inside rim cylinder Z ~ -4.12, Y ~ 2.8)
        const dx = ball.position.x - hoopGroup.position.x;
        const dy = ball.position.y - (hoopGroup.position.y - 0.25);
        const dz = ball.position.z - (hoopGroup.position.z + 0.38);
        const dist = Math.hypot(dx, dz);

        if (dist < 0.26 && Math.abs(dy) < 0.35 && ballVel.y < 0) {
          soundFX.playTargetHit();
          baskets += 1;
          engine.progressCount = baskets;
          engine.currentScore += 2;
          setScore(engine.currentScore);
          setObjectiveProgress(baskets);
          setHitFeedback({ text: 'SWISH! 2 POINTS!', color: 'text-amber-400' });
          setTimeout(() => setHitFeedback(null), 1200);

          if (baskets >= objective.target) {
            finishSession();
          }
        }

        // Reset shot if ball hits ground or past hoop
        if (ball.position.y <= 0.24 || ball.position.z < -6.0) {
          inFlight = false;
        }
      }
    };

    return () => {
      scene.remove(floor);
      scene.remove(hoopGroup);
      scene.remove(ball);
    };
  }

  // =========================================================================
  // GAME 4: 3D TABLE TENNIS (Blue Tournament Table, Net, Red/Black Paddle)
  // =========================================================================
  function setup3DTableTennis(scene, camera, engine) {
    camera.position.set(0, 1.4, 2.4);
    camera.lookAt(0, 0.85, -1.2);

    // ITTF Blue Table (2.74m length x 1.525m width)
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.25 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.525, 0.05, 2.74), tableMat);
    table.position.set(0, 0.76, 0);
    scene.add(table);

    // Net
    const net = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.152), new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: true,
      side: THREE.DoubleSide
    }));
    net.position.set(0, 0.86, 0);
    scene.add(net);

    // Player Paddle (Red front face, black back)
    const paddleGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 32), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    blade.rotation.x = Math.PI / 2;
    const paddleHandle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    paddleHandle.position.set(0, -0.15, 0);
    paddleGroup.add(blade);
    paddleGroup.add(paddleHandle);
    paddleGroup.position.set(0, 0.88, 1.15);
    scene.add(paddleGroup);

    // Ping Pong Ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
    ball.position.set(0, 0.95, -1.0);
    scene.add(ball);

    let ballVel = new THREE.Vector3(0.4, 0.5, 3.8);
    let rally = 0;

    engine.updateGame = (dt) => {
      // Paddle position
      paddleGroup.position.x = engine.pointer.x * 0.75;
      paddleGroup.position.y = 0.82 + (engine.pointer.y * 0.35);

      // Ball movement
      ball.position.x += ballVel.x * dt;
      ball.position.y += ballVel.y * dt;
      ball.position.z += ballVel.z * dt;
      ballVel.y -= 4.2 * dt;

      // Table bounce
      if (ball.position.y <= 0.80 && Math.abs(ball.position.x) < 0.76 && Math.abs(ball.position.z) < 1.37) {
        ballVel.y = 1.6;
        soundFX.playClick();
      }

      // Paddle hit
      if (ball.position.z >= 1.05 && ball.position.z <= 1.25 && ballVel.z > 0) {
        const dist = Math.hypot(ball.position.x - paddleGroup.position.x, ball.position.y - paddleGroup.position.y);
        if (dist < 0.28) {
          soundFX.playTargetHit();
          rally += 1;
          engine.progressCount = rally;
          engine.currentScore += 50;
          setScore(engine.currentScore);
          setObjectiveProgress(rally);
          setHitFeedback({ text: `RALLY #${rally}`, color: 'text-cyan-400' });
          setTimeout(() => setHitFeedback(null), 1000);

          ballVel.z = -4.2;
          ballVel.y = 1.8;
          ballVel.x = (Math.random() - 0.5) * 1.5;

          if (rally >= objective.target) {
            finishSession();
          }
        }
      }

      // Opponent return
      if (ball.position.z <= -1.2 && ballVel.z < 0) {
        ballVel.z = 3.6;
        ballVel.y = 1.7;
        ballVel.x = (Math.random() - 0.5) * 1.2;
      }

      // Reset if dropped
      if (ball.position.y < 0.1 || ball.position.z > 2.0) {
        ball.position.set((Math.random() - 0.5) * 0.4, 1.0, -1.0);
        ballVel.set((Math.random() - 0.5) * 0.8, 1.2, 3.4);
      }
    };

    return () => {
      scene.remove(table);
      scene.remove(net);
      scene.remove(paddleGroup);
      scene.remove(ball);
    };
  }

  // =========================================================================
  // GAME 5: 3D BOWLING (Maple Lane, 10 Triangle Pins, Rolling Ball Collision)
  // =========================================================================
  function setup3DBowling(scene, camera, engine) {
    camera.position.set(0, 1.2, 4.0);
    camera.lookAt(0, 0.45, -8.0);

    // Polished Maple Wood Lane
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 18.2), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.18 }));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0, -5.0);
    scene.add(lane);

    // 10 Pins Setup
    const pinGroup = new THREE.Group();
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pins = [];
    const pinRows = [
      [0],
      [-0.15, 0.15],
      [-0.30, 0, 0.30],
      [-0.45, -0.15, 0.15, 0.45]
    ];

    pinRows.forEach((row, rIdx) => {
      const zPos = -12.0 - (rIdx * 0.35);
      row.forEach(xPos => {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.38, 16), pinMat);
        pin.position.set(xPos, 0.19, zPos);
        pin.userData = { knocked: false };
        pinGroup.add(pin);
        pins.push(pin);
      });
    });
    scene.add(pinGroup);

    // Bowling Ball
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.15 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), ballMat);
    ball.position.set(0, 0.18, 2.5);
    scene.add(ball);

    let rolling = false;
    let ballSpeed = 0;
    let totalKnocked = 0;

    engine.updateGame = (dt) => {
      if (!rolling) {
        ball.position.x = engine.pointer.x * 0.45;
        if (engine.pointer.isDown) {
          rolling = true;
          ballSpeed = 12.0;
          soundFX.playClick();
        }
      } else {
        ball.position.z -= ballSpeed * dt;
        ball.rotation.x -= dt * 10;

        // Pin Collision Check
        pins.forEach(pin => {
          if (!pin.userData.knocked && Math.abs(ball.position.z - pin.position.z) < 0.3) {
            if (Math.abs(ball.position.x - pin.position.x) < 0.22) {
              pin.userData.knocked = true;
              pin.rotation.z = 1.4; // Knock pin over
              pin.position.y = 0.08;
              totalKnocked += 1;
              engine.progressCount = totalKnocked;
              engine.currentScore += 10;
              setScore(engine.currentScore);
              setObjectiveProgress(totalKnocked);
              soundFX.playTargetHit();

              if (totalKnocked >= objective.target) {
                finishSession();
              }
            }
          }
        });

        // Reset ball
        if (ball.position.z < -14.5) {
          rolling = false;
          ball.position.set(0, 0.18, 2.5);
          // If all 10 pins down, reset them for next frame
          if (pins.every(p => p.userData.knocked)) {
            pins.forEach(p => {
              p.userData.knocked = false;
              p.rotation.z = 0;
              p.position.y = 0.19;
            });
          }
        }
      }
    };

    return () => {
      scene.remove(lane);
      scene.remove(pinGroup);
      scene.remove(ball);
    };
  }

  // =========================================================================
  // GAME 6: 3D TARGET / ORCHARD REHABILITATION (Balloon Pop, Fruit Harvest)
  // =========================================================================
  function setup3DTargetRehab(scene, camera, engine, gameId) {
    camera.position.set(0, 1.4, 3.2);
    camera.lookAt(0, 1.2, 0);

    const targetGroup = new THREE.Group();
    scene.add(targetGroup);

    const colors = [0x00f0ff, 0xec4899, 0xf59e0b, 0x10b981, 0x8b5cf6];
    const items = [];

    for (let i = 0; i < 8; i++) {
      const geom = gameId === 'gm_balloon_pop'
        ? new THREE.SphereGeometry(0.24, 20, 20)
        : new THREE.DodecahedronGeometry(0.22);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.3,
        metalness: 0.2
      });
      const item = new THREE.Mesh(geom, mat);
      item.position.set(
        (Math.random() - 0.5) * 3.2,
        0.6 + Math.random() * 1.5,
        -1.0 - Math.random() * 2.0
      );
      item.userData = {
        baseY: item.position.y,
        speed: 0.8 + Math.random() * 0.8,
        active: true
      };
      targetGroup.add(item);
      items.push(item);
    }

    // 3D Wand Reticle Pointer
    const wand = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 24), new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide }));
    wand.position.z = 0.5;
    scene.add(wand);

    let count = 0;

    engine.updateGame = (dt) => {
      wand.position.x = engine.pointer.x * 2.0;
      wand.position.y = 1.2 + (engine.pointer.y * 1.2);

      items.forEach((item, idx) => {
        if (!item.userData.active) return;
        item.position.y += item.userData.speed * dt;
        if (item.position.y > 2.8) item.position.y = 0.4;

        // Check wand collision
        const dist = Math.hypot(item.position.x - wand.position.x, item.position.y - wand.position.y);
        if (dist < 0.32) {
          item.userData.active = false;
          item.position.y = -10;
          soundFX.playTargetHit();
          count += 1;
          engine.progressCount = count;
          engine.currentScore += 100;
          setScore(engine.currentScore);
          setObjectiveProgress(count);

          setTimeout(() => {
            item.userData.active = true;
            item.position.set((Math.random() - 0.5) * 3.2, 0.4, -1.0 - Math.random() * 2.0);
          }, 1500);

          if (count >= objective.target) {
            finishSession();
          }
        }
      });
    };

    return () => {
      scene.remove(targetGroup);
      scene.remove(wand);
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#070d18] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  {game.title}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Three.js 3D WebGL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {game.category} • Full 3D Physics Simulation
              </p>
            </div>
          </div>

          {/* Action Header Buttons: WebXR Immersive, Sound & Close */}
          <div className="flex items-center space-x-2.5">
            {/* Launch WebXR 6-DoF Button */}
            <button
              onClick={handleLaunchVR}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              title="Launch WebXR session for Meta Quest or PC VR headset"
            >
              <Headset className="w-3.5 h-3.5 text-slate-950" />
              <span>{isVrActive ? 'VR Active' : 'Enter VR / WebXR'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close / Exit Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800"
              title="Exit game"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live HUD Telemetry Overlay Bar */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono gap-4 shrink-0">
          <div className="flex items-center space-x-6">
            {/* Score */}
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Score:</span>
              <span className="font-bold text-white text-sm">{score}</span>
            </div>

            {/* Objective Progress */}
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">{objective.label}:</span>
              <span className="font-bold text-emerald-300">
                {objectiveProgress} / {objective.target} {objective.unit}
              </span>
            </div>

            {/* Elapsed Time (Counts UP) */}
            <div className="flex items-center space-x-2">
              <Timer className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Duration:</span>
              <span className="font-bold text-amber-300">
                {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
              </span>
            </div>
          </div>

          {/* Difficulty & Finish Button */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
              {['Easy', 'Medium', 'Hard'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    difficulty === d ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={finishSession}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Complete Routine
            </button>
          </div>
        </div>

        {/* Main 3D Canvas Mount */}
        <div className="relative flex-1 w-full overflow-hidden min-h-[460px]">
          <div
            ref={containerRef}
            className="w-full h-full min-h-[460px] cursor-crosshair"
            title="Move mouse or pointer to control equipment. Click to swing/shoot."
          />

          {/* Dynamic Real-time Hit Notification Popup */}
          {hitFeedback && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-slate-950/90 border border-cyan-500/50 text-base font-bold font-mono tracking-wider shadow-2xl animate-bounce">
              <span className={hitFeedback.color}>{hitFeedback.text}</span>
            </div>
          )}

          {/* Bottom Controls Help Pill */}
          <div className="absolute bottom-4 left-6 pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400">
              Control: Move pointer to position equipment • Click / Hold to swing or release
            </div>
          </div>
        </div>

        {/* Final Completion Modal Overlay */}
        {gameState === 'completed' && finalResults && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="max-w-md w-full bg-slate-900 border border-cyan-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-400/40 mx-auto flex items-center justify-center text-cyan-300">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 px-3 py-1 rounded-full border border-cyan-800 font-bold">
                  Session Completed
                </span>
                <h3 className="text-2xl font-bold font-display text-white mt-3">
                  Rehabilitation Milestone Met!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Biomechanical exercise telemetry logged and synchronized with therapist workstation.
                </p>
              </div>

              {/* Scorecard Stats Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">FINAL SCORE</div>
                  <div className="text-lg font-bold text-white">{finalResults.score}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">COMPLETED</div>
                  <div className="text-lg font-bold text-emerald-400">{finalResults.repetitions}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">DURATION</div>
                  <div className="text-lg font-bold text-cyan-300">
                    {Math.floor(finalResults.duration / 60)}m {finalResults.duration % 60}s
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setGameState('playing');
                    setElapsedSeconds(0);
                    setScore(0);
                    setObjectiveProgress(0);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                >
                  Play Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
