export const HEADSET_COMPONENTS = [
  {
    id: 'front_housing',
    name: 'Front Housing Visor',
    role: 'Impact Protection & Thermal Shell',
    rehabRole: 'Lightweight aerodynamic housing engineered from rigid polycarbonate to protect optical arrays while remaining featherlight (under 500g) to prevent neck strain during cervical and motor rehabilitation.',
    specs: 'Polycarbonate shell, matte silver/white finish, 0.8mm structural wall thickness',
    vector: [0, 0, 2.8]
  },
  {
    id: 'display_panels',
    name: 'Dual Fast-Switch LCD Displays',
    role: 'High-Fidelity Visual Stimulation',
    rehabRole: 'Provides crisp 1832 x 1920 resolution per eye with 90Hz/120Hz refresh rates, delivering flicker-free depth perception crucial for preventing visual vestibular disorientation during upper-limb reaching tasks.',
    specs: 'Dual 3.5-inch LCDs, 1832 x 1920 px/eye, 773 PPI, sub-millisecond pixel response',
    vector: [0, 0, 1.8]
  },
  {
    id: 'optical_lenses',
    name: 'Fresnel Pancake Optical Lenses',
    role: 'Wide-FOV Retinal Projection',
    rehabRole: 'Multi-element optical design ensures an expansive 106° field of view with edge-to-edge clarity, enabling patients to track virtual targets in their peripheral vision without compensatory neck twisting.',
    specs: 'Folded pancake optics, anti-reflective coating, continuous 58-72mm mechanical IPD adjustment',
    vector: [0, 0, 0.9]
  },
  {
    id: 'camera_array',
    name: 'Stereo Passthrough Camera Array',
    role: 'Full-Color Mixed Reality Video',
    rehabRole: 'Blends virtual rehabilitation objects into the patient’s real living room or clinic environment, providing spatial reassurance and anchoring virtual therapy directly onto real tables.',
    specs: 'Dual 16MP RGB high-dynamic-range cameras, 18 PPD passthrough acuity, sub-12ms latency',
    vector: [0, 0.8, 2.5]
  },
  {
    id: 'tracking_cameras',
    name: 'Inside-Out 6-DoF Optical Cameras',
    role: 'Millimeter-Level Spatial SLAM Tracking',
    rehabRole: 'Four wide-angle cameras continuously map 3D clinical space and track hand position without requiring external lighthouses or wall-mounted sensors, making clinic and home setups frictionless.',
    specs: '4x global shutter infrared optical tracking sensors, 120 FPS high-speed capture',
    vector: [1.8, 1.2, 1.5]
  },
  {
    id: 'depth_sensors',
    name: 'Time-of-Flight IR Depth Sensors',
    role: 'Precision Volumetric Environment Mapping',
    rehabRole: 'Measures table surface distance and patient arm reach envelope with sub-millimeter depth accuracy to validate active range of motion angles during guided reaching.',
    specs: 'IR VCSEL pulsed ToF emitter, 5-meter operational range, millimeter depth resolution',
    vector: [0, -0.9, 2.2]
  },
  {
    id: 'imu_sensors',
    name: 'High-Frequency 6-Axis IMU Unit',
    role: 'Angular Velocity & Inertial Telemetry',
    rehabRole: 'Detects micro-tremors, head stability, and postural sway at 1000Hz, enabling clinicians to monitor fatigue-induced head tilting and compensatory torso movement.',
    specs: '6-DoF MEMS accelerometer & gyroscope with dedicated on-chip sensor fusion filtering',
    vector: [0.9, 0, 0.3]
  },
  {
    id: 'processor_module',
    name: 'Snapdragon XR2 Computing Module',
    role: 'Real-Time Edge XR & AI Processing',
    rehabRole: 'Executes MediaPipe hand tracking models, 3D graphics rendering, and real-time biomechanical kinematics processing locally on-device with zero perceptual lag.',
    specs: 'Octa-core Kryo CPU, Adreno 650 GPU, Hexagon DSP with dedicated AI tensor accelerator',
    vector: [-0.8, 0.2, 0.4]
  },
  {
    id: 'ram_storage',
    name: 'LPDDR5 RAM & Fast Flash Storage',
    role: 'High-Throughput Clinical Data Pipeline',
    rehabRole: 'Buffers real-time joint kinematic trajectories and 21-landmark tracking vectors locally before secure synchronization with the clinical database.',
    specs: '6GB LPDDR5 high-speed memory (5500 Mbps), 256GB UFS 3.1 clinical storage',
    vector: [-1.2, 0.2, 0.2]
  },
  {
    id: 'battery_pack',
    name: 'Balanced Lithium-Ion Battery Pack',
    role: 'Counter-Balanced Cordless Power',
    rehabRole: 'Mounted at the rear of the head strap to achieve an ideal 50:50 weight distribution, eliminating downward facial pressure and cervical spine fatigue during therapy sessions.',
    specs: '5400 mAh high-density cell, 2.5 hours continuous therapeutic runtime, fast USB-PD charging',
    vector: [0, -0.4, -2.8]
  },
  {
    id: 'cooling_system',
    name: 'Radial Blower & Vapor Chamber',
    role: 'Silent Thermal Dissipation',
    rehabRole: 'Draws warm air away from the patient’s face and optics to prevent lens fogging and facial perspiration, maintaining optimal comfort during vigorous motor rehabilitation.',
    specs: 'Whisper-quiet ultra-thin fluid dynamic bearing fan (<18dB), micro copper heat pipes',
    vector: [0, 1.4, 0.5]
  },
  {
    id: 'motherboard_pcb',
    name: 'Multi-Layer Rigid-Flex PCB',
    role: 'Central Electronic Circuit Hub',
    rehabRole: 'Connects all sensors, displays, and compute modules with gold-plated contacts and EMI shielding, ensuring robust signal integrity in hospital environments.',
    specs: '10-layer ultra-dense HDI PCB, immersion gold finish, integrated RF shielding cans',
    vector: [-0.2, 0, 0.2]
  },
  {
    id: 'audio_speakers',
    name: 'Integrated Positional Audio Speakers',
    role: 'Spatial Audio Biofeedback',
    rehabRole: 'Delivers 3D directional sound cues to guide patient attention toward reaching targets in spatial coordination exercises without occluding ambient clinical conversations.',
    specs: 'Dual near-ear directional acoustic drivers, dynamic bass boost, spatial HRTF synthesis',
    vector: [2.1, 0, -0.6]
  },
  {
    id: 'head_strap',
    name: 'Ergonomic Ratchet Head Strap',
    role: 'Clinical Comfort & Weight Distribution',
    rehabRole: 'Features a precision rear micro-adjustment wheel dial that allows one-handed tightening for hemiparetic patients who may have limited mobility in one hand.',
    specs: 'Rigid composite side straps, rear rotary micro-dial mechanism, top suspension strap',
    vector: [0, 0, -2.2]
  },
  {
    id: 'face_cushion',
    name: 'Medical-Grade Contoured Face Cushion',
    role: 'Biocompatible Skin Interface',
    rehabRole: 'Manufactured from antimicrobial memory foam wrapped in wipe-clean silicone, designed to distribute facial pressure evenly and withstand routine clinical sanitization.',
    specs: 'Hypoallergenic memory foam, magnetic snap-on attachment, medical silicone gasket',
    vector: [0, 0, -0.7]
  },
  {
    id: 'connectivity_ports',
    name: 'High-Speed Connectivity & Ports',
    role: 'Therapist Live Telemetry Streaming',
    rehabRole: 'Streams live 60 FPS hand tracking coordinates and session video directly to the therapist’s supervision dashboard via ultra-low latency Wi-Fi 6E or USB-C tethering.',
    specs: 'Wi-Fi 6E (6GHz), Bluetooth 5.2, USB-C 3.2 Gen 2 (10Gbps) with DisplayPort Alternate Mode',
    vector: [-1.9, -0.6, 0.8]
  },
  {
    id: 'controller_sensors',
    name: 'Sub-Millimeter Optical Tracking Rings',
    role: 'Precision Grasp & Finger Telemetry',
    rehabRole: 'Infrared LED constellation rings combined with computer vision provide sub-millimeter finger position and grip force feedback for fine motor rehabilitation.',
    specs: 'Constellation IR LED array, capacitive thumb/finger rest, haptic linear resonant actuator',
    vector: [1.8, -1.5, 0.5]
  }
];
