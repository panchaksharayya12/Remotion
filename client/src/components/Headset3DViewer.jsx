import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw, Play, Pause, Layers, Info, Cpu, ShieldCheck, Activity, X,
  Maximize2, Eye, Sparkles, Sliders, Video, Box, ChevronRight, Check
} from 'lucide-react';
import { HEADSET_COMPONENTS } from './Headset3DViewerComponents';

export default function Headset3DViewer({ initialExploded = false }) {
  const mountRef = useRef(null);
  const [explodedFactor, setExplodedFactor] = useState(initialExploded ? 1 : 0);
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [isTurntableActive, setIsTurntableActive] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [activePreset, setActivePreset] = useState('front'); // 'front', 'optics', 'internals', 'rear'

  // Three.js internal references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshesRef = useRef({});
  const hotspotMarkersRef = useRef([]);
  const explodedTargetRef = useRef(initialExploded ? 1 : 0);
  const mouseRef = useRef({ isDragging: false, prevX: 0, prevY: 0, rotX: 0.1, rotY: 0.35 });
  const headsetGroupRef = useRef(null);
  const animFrameRef = useRef(null);

  const activeComponent = HEADSET_COMPONENTS.find(c => c.id === selectedCompId) || HEADSET_COMPONENTS[0];

  useEffect(() => {
    explodedTargetRef.current = explodedFactor;
  }, [explodedFactor]);

  // Handle Preset Camera Angles
  const handleSelectPreset = (preset) => {
    setActivePreset(preset);
    setIsTurntableActive(false);
    if (!mouseRef.current) return;
    if (preset === 'front') {
      mouseRef.current.rotX = 0.05;
      mouseRef.current.rotY = 0.1;
    } else if (preset === 'optics') {
      mouseRef.current.rotX = 0.15;
      mouseRef.current.rotY = Math.PI; // Look from the back/eye side
    } else if (preset === 'internals') {
      mouseRef.current.rotX = 0.35;
      mouseRef.current.rotY = 0.75;
      setExplodedFactor(0.85);
    } else if (preset === 'rear') {
      mouseRef.current.rotX = 0.1;
      mouseRef.current.rotY = Math.PI * 0.85;
    }
  };

  // Select component and trigger explanation drawer
  const handleSelectComponent = (id) => {
    setSelectedCompId(id);
    setShowExplanation(true);
    setIsTurntableActive(false);
  };

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Lighting Rig (Vecteezy artist concept style)
    const ambientLight = new THREE.AmbientLight(0x0c1626, 3.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 4.2);
    cyanRim.position.set(-5, 1, -4);
    scene.add(cyanRim);

    const blueFill = new THREE.DirectionalLight(0x38bdf8, 2.5);
    blueFill.position.set(-4, 3, 4);
    scene.add(blueFill);

    const warmUnder = new THREE.DirectionalLight(0x818cf8, 1.8);
    warmUnder.position.set(0, -4, 2);
    scene.add(warmUnder);

    // Subtle reflective grid floor
    const gridHelper = new THREE.GridHelper(8, 20, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = -1.4;
    gridHelper.material.opacity = 0.20;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Main Headset Group
    const headsetGroup = new THREE.Group();
    scene.add(headsetGroup);
    headsetGroupRef.current = headsetGroup;

    const meshes = {};

    // PBR Materials
    const sleekWhiteChassisMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.16,
      metalness: 0.05,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1
    });

    const glossyFrontShieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x060913,
      roughness: 0.04,
      metalness: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.98
    });

    const opticalPancakeLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.03,
      transmission: 0.94,
      thickness: 1.2,
      ior: 1.55,
      reflectivity: 0.95
    });

    const cameraLensGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0369a1,
      roughness: 0.04,
      metalness: 0.92,
      clearcoat: 1.0
    });

    const polishedChromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12
    });

    const glowingHudDisplayMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });

    const softFabricFaceCushionMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.0
    });

    const strapDurableWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.08
    });

    const darkAlloyChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.82,
      roughness: 0.28
    });

    const copperHeatPipeMat = new THREE.MeshStandardMaterial({
      color: 0xc27838,
      metalness: 0.88,
      roughness: 0.22
    });

    function addComponentMesh(id, mesh) {
      mesh.userData = { id, originalPos: mesh.position.clone() };
      headsetGroup.add(mesh);
      meshes[id] = mesh;
    }

    // 1. FRONT HOUSING & GLOSS VISOR (Streamlined Pill Shape)
    const frontVisorGroup = new THREE.Group();
    // Visor main curved body
    const visorCurveGeom = new THREE.CylinderGeometry(1.42, 1.38, 1.05, 48, 1, false, -Math.PI / 2.3, Math.PI / 1.15);
    const visorShell = new THREE.Mesh(visorCurveGeom, sleekWhiteChassisMat);
    visorShell.rotation.y = Math.PI;
    frontVisorGroup.add(visorShell);

    // Front high-gloss center glass shield (Vecteezy artist concept look)
    const glassShieldGeom = new THREE.CylinderGeometry(1.44, 1.40, 0.72, 48, 1, false, -Math.PI / 2.7, Math.PI / 1.35);
    const glassShield = new THREE.Mesh(glassShieldGeom, glossyFrontShieldMat);
    glassShield.rotation.y = Math.PI;
    glassShield.position.set(0, 0, 0.02);
    frontVisorGroup.add(glassShield);

    // Subtle Cyan LED status indicator light bar
    const ledBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.04), glowingHudDisplayMat);
    ledBar.position.set(0, 0.42, 1.41);
    frontVisorGroup.add(ledBar);

    frontVisorGroup.position.set(0, 0, 0.35);
    addComponentMesh('front_housing', frontVisorGroup);

    // 2. DUAL FAST-SWITCH LCD DISPLAYS (Stereoscopic Backlit Displays)
    const displayGroup = new THREE.Group();
    const leftDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.03), glowingHudDisplayMat);
    leftDisplay.position.set(-0.44, 0, 0.16);
    const rightDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.03), glowingHudDisplayMat);
    rightDisplay.position.set(0.44, 0, 0.16);
    displayGroup.add(leftDisplay);
    displayGroup.add(rightDisplay);
    addComponentMesh('display_panels', displayGroup);

    // 3. FRESNEL PANCAKE OPTICAL LENSES (Dual High-Clarity Pancake Elements)
    const lensGroup = new THREE.Group();
    [-0.44, 0.44].forEach((lx) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.10, 36), darkAlloyChassisMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(lx, 0, -0.04);

      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.12, 36), opticalPancakeLensMat);
      glass.rotation.x = Math.PI / 2;
      glass.position.set(lx, 0, -0.03);

      const chromeRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 12, 32), polishedChromeMat);
      chromeRing.position.set(lx, 0, 0.03);

      lensGroup.add(barrel);
      lensGroup.add(glass);
      lensGroup.add(chromeRing);
    });
    addComponentMesh('optical_lenses', lensGroup);

    // 4. STEREO PASSTHROUGH CAMERA ARRAY (Dual Front Vertical Sensor Pills)
    const camGroup = new THREE.Group();
    [-0.46, 0.46].forEach((cx) => {
      const pillBezel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.44, 0.07), darkAlloyChassisMat);
      pillBezel.position.set(cx, 0.05, 0.60);

      const lens1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24), cameraLensGlassMat);
      lens1.rotation.x = Math.PI / 2;
      lens1.position.set(cx, 0.15, 0.62);

      const lens2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24), cameraLensGlassMat);
      lens2.rotation.x = Math.PI / 2;
      lens2.position.set(cx, -0.05, 0.62);

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 8, 24), polishedChromeMat);
      ring1.position.set(cx, 0.15, 0.66);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 8, 24), polishedChromeMat);
      ring2.position.set(cx, -0.05, 0.66);

      camGroup.add(pillBezel);
      camGroup.add(lens1);
      camGroup.add(lens2);
      camGroup.add(ring1);
      camGroup.add(ring2);
    });
    addComponentMesh('camera_array', camGroup);

    // 5. 6-DOF OPTICAL TRACKING CAMERAS (4 Corner Sensors)
    const trackGroup = new THREE.Group();
    [
      [-1.08, 0.30, 0.22], [1.08, 0.30, 0.22],
      [-1.08, -0.30, 0.22], [1.08, -0.30, 0.22]
    ].forEach(([tx, ty, tz]) => {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), darkAlloyChassisMat);
      socket.position.set(tx, ty, tz);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 20), cameraLensGlassMat);
      lens.position.set(tx, ty, tz + 0.03);
      trackGroup.add(socket);
      trackGroup.add(lens);
    });
    addComponentMesh('tracking_cameras', trackGroup);

    // 6. DEPTH SENSORS & TOF EMITTER (Center Lower Sensor Module)
    const depthGroup = new THREE.Group();
    const depthBezel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.13, 0.07), darkAlloyChassisMat);
    depthBezel.position.set(0, -0.24, 0.58);
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 18), polishedChromeMat);
    emitter.rotation.x = Math.PI / 2;
    emitter.position.set(-0.11, -0.24, 0.60);
    const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 18), cameraLensGlassMat);
    receiver.rotation.x = Math.PI / 2;
    receiver.position.set(0.11, -0.24, 0.60);
    depthGroup.add(depthBezel);
    depthGroup.add(emitter);
    depthGroup.add(receiver);
    addComponentMesh('depth_sensors', depthGroup);

    // 7. SNAPDRAGON XR2 PROCESSOR MODULE & MOTHERBOARD
    const procGroup = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.03), darkAlloyChassisMat);
    board.position.set(0, 0.02, 0.08);
    const socChip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.04), polishedChromeMat);
    socChip.position.set(0, 0.05, 0.10);
    const ramChip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.035), darkAlloyChassisMat);
    ramChip.position.set(0.32, 0.05, 0.10);
    procGroup.add(board);
    procGroup.add(socChip);
    procGroup.add(ramChip);
    addComponentMesh('processor_module', procGroup);

    // 8. COOLING SYSTEM (Vapor Chamber & Heat Pipes)
    const coolingGroup = new THREE.Group();
    const copperPlate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.025), copperHeatPipeMat);
    copperPlate.position.set(0, 0.12, 0.22);
    const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 16), copperHeatPipeMat);
    pipe1.rotation.z = Math.PI / 2;
    pipe1.position.set(0, 0.24, 0.23);
    coolingGroup.add(copperPlate);
    coolingGroup.add(pipe1);
    addComponentMesh('cooling_system', coolingGroup);

    // 9. ERGONOMIC FACIAL INTERFACE & CUSHION (Soft Breathable Padding)
    const cushionGroup = new THREE.Group();
    const cushionBezel = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.12, 16, 36), softFabricFaceCushionMat);
    cushionBezel.scale.set(1.22, 0.72, 0.55);
    cushionBezel.position.set(0, -0.02, -0.22);
    cushionGroup.add(cushionBezel);
    addComponentMesh('facial_interface', cushionGroup);

    // 10. RIGID HALO HEAD STRAP & COUNTERWEIGHT REAR DIAL
    const strapGroup = new THREE.Group();
    // Side arms
    [-1.05, 1.05].forEach((sx) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 1.55), strapDurableWhiteMat);
      arm.position.set(sx, 0.02, -0.75);
      strapGroup.add(arm);
    });
    // Rear curved cradle
    const rearCradle = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.42, 32, 1, false, -Math.PI / 3, Math.PI / 1.5), strapDurableWhiteMat);
    rearCradle.position.set(0, 0.02, -1.52);
    strapGroup.add(rearCradle);

    // Rear Fit Adjustment Wheel Dial
    const fitDial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 32), polishedChromeMat);
    fitDial.rotation.x = Math.PI / 2;
    fitDial.position.set(0, 0.02, -1.58);
    strapGroup.add(fitDial);

    addComponentMesh('rigid_strap', strapGroup);

    // 11. COUNTER-BALANCED REAR BATTERY PACK
    const batteryGroup = new THREE.Group();
    const batteryCell = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.16), darkAlloyChassisMat);
    batteryCell.position.set(0, 0.02, -1.64);
    const chargingPort = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), polishedChromeMat);
    chargingPort.position.set(0, -0.10, -1.72);
    batteryGroup.add(batteryCell);
    batteryGroup.add(chargingPort);
    addComponentMesh('battery_pack', batteryGroup);

    meshesRef.current = meshes;

    // Interactive Hotspot Click Markers (Glowing Pulses on the 3D Headset)
    const hotspots = [
      { id: 'front_housing', pos: [0, 0.35, 1.45], label: 'Visor & Shield' },
      { id: 'camera_array', pos: [0.46, 0.15, 0.72], label: 'Color Passthrough' },
      { id: 'optical_lenses', pos: [-0.44, 0.02, 0.02], label: 'Pancake Optics' },
      { id: 'tracking_cameras', pos: [-1.08, 0.30, 0.30], label: '6-DoF SLAM' },
      { id: 'depth_sensors', pos: [0, -0.24, 0.68], label: 'ToF Depth' },
      { id: 'processor_module', pos: [0, 0.08, 0.18], label: 'XR2 Gen 2' },
      { id: 'battery_pack', pos: [0, 0.02, -1.75], label: 'Rear Battery' },
      { id: 'facial_interface', pos: [0, -0.45, -0.25], label: 'Facial Seal' }
    ];

    const hotspotMeshes = [];
    hotspots.forEach(hs => {
      const pinGroup = new THREE.Group();
      pinGroup.position.set(...hs.pos);

      // Glowing outer ring
      const ringGeom = new THREE.RingGeometry(0.035, 0.05, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      pinGroup.add(ringMesh);

      // Inner glowing core dot
      const dotGeom = new THREE.CircleGeometry(0.025, 20);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      pinGroup.add(dotMesh);

      pinGroup.userData = { id: hs.id, label: hs.label, isHotspot: true };
      headsetGroup.add(pinGroup);
      hotspotMeshes.push(pinGroup);
    });
    hotspotMarkersRef.current = hotspotMeshes;

    // Raycaster for Clicking 3D Hotspots
    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const handleCanvasClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseCoord.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseCoord, camera);
      const intersects = raycaster.intersectObjects(headsetGroup.children, true);

      if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit && hit.parent !== headsetGroup && hit.parent !== scene) {
          hit = hit.parent;
        }
        if (hit && hit.userData && hit.userData.id) {
          handleSelectComponent(hit.userData.id);
        }
      }
    };

    // Smooth Drag Rotation (Mouse & Touch) - NO MOUSEWHEEL HIJACKING!
    const dom = renderer.domElement;

    const onMouseDown = (e) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.prevX = e.clientX;
      mouseRef.current.prevY = e.clientY;
      setIsTurntableActive(false);
    };

    const onMouseMove = (e) => {
      if (!mouseRef.current.isDragging) return;
      const dx = e.clientX - mouseRef.current.prevX;
      const dy = e.clientY - mouseRef.current.prevY;
      mouseRef.current.rotY += dx * 0.008;
      mouseRef.current.rotX = Math.max(-0.6, Math.min(0.6, mouseRef.current.rotX + dy * 0.008));
      mouseRef.current.prevX = e.clientX;
      mouseRef.current.prevY = e.clientY;
    };

    const onMouseUp = () => {
      mouseRef.current.isDragging = false;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        mouseRef.current.isDragging = true;
        mouseRef.current.prevX = e.touches[0].clientX;
        mouseRef.current.prevY = e.touches[0].clientY;
        setIsTurntableActive(false);
      }
    };

    const onTouchMove = (e) => {
      if (!mouseRef.current.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - mouseRef.current.prevX;
      const dy = e.touches[0].clientY - mouseRef.current.prevY;
      mouseRef.current.rotY += dx * 0.009;
      mouseRef.current.rotX = Math.max(-0.6, Math.min(0.6, mouseRef.current.rotX + dy * 0.009));
      mouseRef.current.prevX = e.touches[0].clientX;
      mouseRef.current.prevY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      mouseRef.current.isDragging = false;
    };

    dom.addEventListener('click', handleCanvasClick);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Animation & Turntable Loop
    let currentFactor = explodedTargetRef.current;
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth turntable orbit if active
      if (isTurntableActive) {
        mouseRef.current.rotY += 0.0035;
      }

      // Smooth rotation dampening
      headsetGroup.rotation.y = mouseRef.current.rotY;
      headsetGroup.rotation.x = mouseRef.current.rotX;

      // Animate Exploded View interpolation
      currentFactor += (explodedTargetRef.current - currentFactor) * 0.08;

      HEADSET_COMPONENTS.forEach(comp => {
        const mesh = meshes[comp.id];
        if (mesh && comp.vector) {
          mesh.position.x = mesh.userData.originalPos.x + comp.vector[0] * currentFactor;
          mesh.position.y = mesh.userData.originalPos.y + comp.vector[1] * currentFactor;
          mesh.position.z = mesh.userData.originalPos.z + comp.vector[2] * currentFactor;
        }
      });

      // Pulse hotspot pins
      hotspotMeshes.forEach((pin, i) => {
        const s = 1.0 + Math.sin(elapsed * 4 + i) * 0.18;
        pin.scale.set(s, s, s);
        pin.quaternion.copy(camera.quaternion); // Always face camera
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight || 580;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      dom.removeEventListener('click', handleCanvasClick);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isTurntableActive]);

  return (
    <div className="relative w-full rounded-3xl bg-[#080d19] border border-cyan-500/25 overflow-hidden shadow-2xl">
      {/* Top Interactive Controls Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Preset Angle Buttons */}
        <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 pointer-events-auto">
          {[
            { id: 'front', label: 'Front Visor' },
            { id: 'optics', label: 'Optics & Display' },
            { id: 'internals', label: 'Disassembly' },
            { id: 'rear', label: 'Battery Halo' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activePreset === p.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Turntable & Disassembly Slider Controls */}
        <div className="flex items-center space-x-3 p-1.5 px-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 pointer-events-auto">
          {/* Turntable Auto-spin button */}
          <button
            onClick={() => setIsTurntableActive(!isTurntableActive)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              isTurntableActive
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Cinematic Turntable Orbit"
          >
            {isTurntableActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Turntable</span>
          </button>

          {/* Disassembly / Exploded Slider */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">Disassembly:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={explodedFactor}
              onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-cyan-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-cyan-400 w-8">
              {Math.round(explodedFactor * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Mount (Native Mouse Drag & Smooth Orbit) */}
      <div
        ref={mountRef}
        className="w-full h-[540px] sm:h-[620px] cursor-grab active:cursor-grabbing relative"
        title="Click and drag to rotate 3D headset. Click glowing pins to inspect components."
      />

      {/* Subtle Bottom Instruction Banner */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="p-2.5 px-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>Click glowing pins on headset to inspect subsystems • Drag to rotate in 3D</span>
        </div>
      </div>

      {/* Quick Component Selection Pills (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-20 max-w-[280px] sm:max-w-md overflow-x-auto p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 flex items-center space-x-1 scrollbar-none">
        {HEADSET_COMPONENTS.slice(0, 6).map(c => (
          <button
            key={c.id}
            onClick={() => handleSelectComponent(c.id)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-mono whitespace-nowrap transition-all ${
              selectedCompId === c.id
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            {c.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* SLIDE-OVER EXPLANATION DRAWER (Only appears when clicked!) */}
      {showExplanation && activeComponent && (
        <div className="absolute top-4 right-4 bottom-4 w-full sm:w-[380px] z-30 bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between animate-fadeIn overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
                Subsystem Inspection
              </span>
              <button
                onClick={() => setShowExplanation(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Close explanation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-bold font-display text-white">
              {activeComponent.name}
            </h3>

            <div className="text-xs font-mono text-cyan-300 mt-1 mb-4">
              Primary Role: {activeComponent.role}
            </div>

            {/* Clinical Rehabilitation Function */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 mb-4">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-300 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Role in Motor Rehabilitation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeComponent.rehabRole}
              </p>
            </div>

            {/* Engineering Specifications */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200 mb-1.5">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span>Engineering Specifications</span>
              </div>
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                {activeComponent.specs}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">
              Mixed-Reality Hardware Architecture
            </span>
            <button
              onClick={() => setShowExplanation(false)}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              Resume 3D View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
