// Vercel Serverless Function: ReMotion Core Clinical API
// Handles authentication, role routing, patient dashboard, therapist caseloads, and game catalogs

const DEMO_USERS = {
  'patient@remotion.health': {
    id: 'u_patient_1',
    email: 'patient@remotion.health',
    role: 'patient',
    name: 'Asha Sharma',
    avatar: 'AS',
    phone: '+91 98450 00201',
    profile: {
      id: 'pt_1',
      age: 58,
      gender: 'Female',
      condition: 'Post-Stroke Left Upper Limb Hemiparesis',
      recovery_level: 'Intermediate Recovery (Stage 4)',
      affected_side: 'Left',
      xp: 480,
      streak: 7,
      level: 4,
      primary_language: 'hi',
      emergency_contact: '+91 98450 99991'
    }
  },
  'therapist@remotion.health': {
    id: 'u_therapist_1',
    email: 'therapist@remotion.health',
    role: 'therapist',
    name: 'Dr. Rajesh Kulkarni, PT',
    avatar: 'RK',
    phone: '+91 98450 00102',
    profile: {
      id: 'th_1',
      specialization: 'Neuro-Rehabilitation & Motor Recovery',
      license_number: 'MCI-PT-2015-8842',
      hospital: 'Centre for Neuro Sciences',
      experience_years: 14
    }
  },
  'admin@remotion.health': {
    id: 'u_admin',
    email: 'admin@remotion.health',
    role: 'admin',
    name: 'System Administrator',
    avatar: 'SA',
    phone: '+91 98450 00101'
  },
  'guest@remotion.health': {
    id: 'u_guest',
    email: 'guest@remotion.health',
    role: 'guest',
    name: 'ReMotion Tech Explorer',
    avatar: 'TE',
    phone: '+91 98450 00301'
  }
};

let PATIENTS = [
  {
    id: 'pt_1',
    user_id: 'u_patient_1',
    name: 'Asha Sharma',
    age: 58,
    gender: 'Female',
    condition: 'Post-Stroke Left Upper Limb Hemiparesis',
    recovery_level: 'Intermediate Recovery (Stage 4)',
    affected_side: 'Left',
    xp: 480,
    streak: 7,
    level: 4,
    compliance: '94%',
    last_session: 'Today at 10:15 AM',
    primary_language: 'hi',
    total_sessions: 6,
    avg_accuracy: 94.2,
    peak_rom: 82.5,
    active_prescriptions_count: 3
  },
  {
    id: 'pt_2',
    user_id: 'u_patient_2',
    name: 'Ravi Patel',
    age: 34,
    gender: 'Male',
    condition: 'Flexor Tendon Strain & Carpal Tunnel Syndrome',
    recovery_level: 'Early Stage (Stage 2)',
    affected_side: 'Right',
    xp: 240,
    streak: 3,
    level: 2,
    compliance: '88%',
    last_session: 'Yesterday',
    primary_language: 'en',
    total_sessions: 3,
    avg_accuracy: 88.0,
    peak_rom: 65.0,
    active_prescriptions_count: 2
  },
  {
    id: 'pt_3',
    user_id: 'u_patient_3',
    name: 'Meena Sundaram',
    age: 46,
    gender: 'Female',
    condition: 'Post-Colles Distal Radius Fracture Stiffness',
    recovery_level: 'Advanced Recovery (Stage 5)',
    affected_side: 'Right',
    xp: 820,
    streak: 14,
    level: 6,
    compliance: '98%',
    last_session: 'Today at 08:30 AM',
    primary_language: 'kn',
    total_sessions: 14,
    avg_accuracy: 96.5,
    peak_rom: 95.0,
    active_prescriptions_count: 4
  }
];

let PRESCRIPTIONS = [
  {
    id: 'rec_1',
    patient_id: 'pt_1',
    exercise_id: 'ex_squeeze_fill',
    exercise_name: 'Squeeze & Fill (Hand Grasp & ROM)',
    target_reps: 15,
    frequency: 'Daily',
    difficulty: 'Moderate',
    instructions: 'Focus on full thumb extension between each grasp to maximize active stretch.',
    clinical_notes: 'Encourage patient to hold clench for 1 full second to recruit deep flexors.',
    status: 'active'
  },
  {
    id: 'rec_2',
    patient_id: 'pt_1',
    exercise_id: 'ex_reach_touch',
    exercise_name: 'Reach & Touch (3D Spatial Coordination)',
    target_reps: 20,
    frequency: 'Daily',
    difficulty: 'Moderate',
    instructions: 'Extend arm completely when reaching for upper quadrants. Maintain steady trunk posture.',
    clinical_notes: 'Assessing lateral shoulder abduction and compensatory trunk lean.',
    status: 'active'
  },
  {
    id: 'rec_3',
    patient_id: 'pt_1',
    exercise_id: 'ex_hand_quiz',
    exercise_name: 'Hand Function Check (Dexterity Assessment)',
    target_reps: 10,
    frequency: '3x Weekly',
    difficulty: 'Easy',
    instructions: 'Perform active finger spreading and hold each position for 3 seconds.',
    clinical_notes: 'Monitoring recovery of independent digit extension.',
    status: 'active'
  }
];

let CLINICAL_MESSAGES = [
  {
    id: 'msg_1',
    sender_id: 'u_therapist_1',
    sender_name: 'Dr. Rajesh Kulkarni, PT',
    receiver_id: 'u_patient_1',
    patient_id: 'pt_1',
    message_text: 'Good morning Asha. Please focus on slow, controlled finger release during Squeeze & Fill.',
    translated_text: 'सुप्रभात आशा। कृपया निचोड़ें और भरें के दौरान धीमी, नियंत्रित उंगली छोड़ने पर ध्यान दें।',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'msg_2',
    sender_id: 'u_patient_1',
    sender_name: 'Asha Sharma',
    receiver_id: 'u_therapist_1',
    patient_id: 'pt_1',
    message_text: 'Thank you doctor, I felt much less fatigue in my fingers today.',
    translated_text: 'धन्यवाद डॉक्टर, आज मुझे अपनी उंगलियों में बहुत कम थकान महसूस हुई।',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'msg_3',
    sender_id: 'u_therapist_1',
    sender_name: 'Dr. Rajesh Kulkarni, PT',
    receiver_id: 'u_patient_2',
    patient_id: 'pt_2',
    message_text: 'Hello Ravi, please maintain 20 degrees wrist elevation during keyboard rest intervals.',
    translated_text: 'Hello Ravi, please maintain 20 degrees wrist elevation during keyboard rest intervals.',
    created_at: new Date(Date.now() - 5400000).toISOString()
  },
  {
    id: 'msg_4',
    sender_id: 'u_patient_2',
    sender_name: 'Ravi Patel',
    receiver_id: 'u_therapist_1',
    patient_id: 'pt_2',
    message_text: 'Understood Dr. Rajesh, doing the tendon gliding stretches twice daily.',
    translated_text: 'Understood Dr. Rajesh, doing the tendon gliding stretches twice daily.',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'msg_5',
    sender_id: 'u_therapist_1',
    sender_name: 'Dr. Rajesh Kulkarni, PT',
    receiver_id: 'u_patient_3',
    patient_id: 'pt_3',
    message_text: 'Namaste Meena, excellent progress on wrist pronation. Keep working towards 90 degrees.',
    translated_text: 'ನಮಸ್ಕಾರ ಮೀನಾ, ಮಣಿಕಟ್ಟಿನ ಪ್ರೊನೇಶನ್‌ನಲ್ಲಿ ಉತ್ತಮ ಪ್ರಗತಿ. 90 ಡಿಗ್ರಿಗಳನ್ನು ಸಾಧಿಸಲು ಮುಂದುವರಿಯಿರಿ.',
    created_at: new Date(Date.now() - 8400000).toISOString()
  }
];

const ALL_REHAB_GAMES = [
  {
    id: 'gm_badminton',
    title: 'Badminton Overhead Rally',
    category: 'Sports Simulation',
    difficulty: 'Moderate',
    target_motors: 'Shoulder Abduction & Grip',
    description: 'Overhead racquet reaching and shuttlecock returns designed for upper-limb motor coordination and shoulder abduction.',
    target: '10 Rallies',
    reps: 10,
    tags: ['Sports Simulation', 'Upper Limb', 'Range & Speed']
  },
  {
    id: 'gm_cricket',
    title: 'Cricket Batting Timing',
    category: 'Sports Simulation',
    difficulty: 'Moderate',
    target_motors: 'Elbow & Forearm Timing',
    description: 'Forward drive stroke timing with 3D willow bat for elbow extension and dynamic balance.',
    target: '12 Balls',
    reps: 12,
    tags: ['Sports Simulation', 'Upper Limb', 'Reflex & Precision']
  },
  {
    id: 'gm_basketball',
    title: 'Basketball Free Throw',
    category: 'Sports Simulation',
    difficulty: 'Hard',
    target_motors: 'Bilateral Shoulder Extension',
    description: 'Parabolic shooting trajectory simulation training upper-extremity extension and release accuracy.',
    target: '8 Baskets',
    reps: 8,
    tags: ['Sports Simulation', 'Upper Limb']
  },
  {
    id: 'gm_table_tennis',
    title: 'Table Tennis Precision',
    category: 'Sports Simulation',
    difficulty: 'Easy',
    target_motors: 'Wrist Pronation & Reflex',
    description: 'High-frequency paddle volleys targeting rapid pronation, supination, and reactive timing.',
    target: '10 Points',
    reps: 10,
    tags: ['Sports Simulation', 'Reflex & Precision']
  },
  {
    id: 'gm_bowling',
    title: 'Bowling Strike Aim',
    category: 'Sports Simulation',
    difficulty: 'Moderate',
    target_motors: 'Trunk & Arm Swing Pendulum',
    description: 'Pendulum arm swing mechanics targeting shoulder stabilization and release timing.',
    target: '30 Pins',
    reps: 30,
    tags: ['Sports Simulation', 'Full Body']
  },
  {
    id: 'gm_balloon_pop',
    title: 'Balloon Pop Warm-up',
    category: 'Range & Speed',
    difficulty: 'Easy',
    target_motors: 'Multi-Quadrant Shoulder Reach',
    description: 'Ascending colorful balloons testing multi-quadrant reaching, target tracking, and active pop timing.',
    target: '15 Balloons',
    reps: 15,
    tags: ['Range & Speed', 'Upper Limb']
  },
  {
    id: 'gm_fruit_reach',
    title: 'Fruit Harvest Reach',
    category: 'Range & Speed',
    difficulty: 'Moderate',
    target_motors: 'Upper Limb Elevation',
    description: 'Virtual orchard fruit picking requiring elevation, extension, and grasp timing.',
    target: '10 Fruits',
    reps: 10,
    tags: ['Range & Speed', 'Upper Limb']
  },
  {
    id: 'gm_squeeze',
    title: 'Sponge Squeeze 3D',
    category: 'Fine Motor & Pinch Grip',
    difficulty: 'Moderate',
    target_motors: 'Finger Flexion & Grasp',
    description: 'Virtual hydrologic sponge compression tracking active finger closure, grasp strength, and peak isometric hold.',
    target: '15 Squeezes',
    reps: 15,
    tags: ['Upper Limb', 'Fine Motor & Pinch Grip']
  },
  {
    id: 'gm_reacher',
    title: 'Star Reacher 3D',
    category: 'Spatial Upper-Limb Coordination',
    difficulty: 'Moderate',
    target_motors: 'Shoulder Abduction & Coordination',
    description: 'Floating stellar constellations requiring multi-directional shoulder abduction and elbow extension.',
    target: '20 Stars',
    reps: 20,
    tags: ['Upper Limb', 'Range & Speed']
  }
];

let CLINICAL_MEETINGS = [
  {
    id: 'mt_weekly_kinematics',
    title: 'Weekly Kinematics Evaluation',
    patient_id: 'pt_1',
    patient_name: 'Asha Sharma',
    therapist_name: 'Dr. Rajesh Kulkarni, PT',
    scheduled_time: 'Today at 04:30 PM',
    duration_minutes: 30,
    room_id: 'remotion-room-pt_1',
    notes: 'Upper-limb ROM evaluation and Squeeze & Fill active flexion check.',
    status: 'scheduled'
  },
  {
    id: 'mt_post_stroke_followup',
    title: 'Post-Stroke Functional Reach Review',
    patient_id: 'pt_1',
    patient_name: 'Asha Sharma',
    therapist_name: 'Dr. Rajesh Kulkarni, PT',
    scheduled_time: 'Tomorrow at 10:30 AM',
    duration_minutes: 45,
    room_id: 'remotion-room-pt_1',
    notes: 'Assess lateral shoulder abduction and virtual target reaching latency.',
    status: 'scheduled'
  }
];

let WEBRTC_SIGNALS = [];
let ACTIVE_CALL_ALERTS = [];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/^\/api/, '');

  let body = {};
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch (e) {}
    } else if (typeof req.body === 'object' && req.body !== null) {
      body = req.body;
    }
  }

  // 1. Auth: Sign In
  if (pathname === '/auth/login' && req.method === 'POST') {
    const { email, password, role: selectedRole } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check pre-configured users
    const matched = DEMO_USERS[cleanEmail];
    if (matched) {
      const token = 'remotion_tok_' + Buffer.from(cleanEmail).toString('base64');
      return res.status(200).json({
        success: true,
        token,
        user: matched
      });
    }

    // Dynamic login for custom credentials based on selected role
    if (cleanEmail.includes('@')) {
      const fallbackRole = selectedRole || (cleanEmail.includes('therapist') ? 'therapist' :
                           cleanEmail.includes('admin') ? 'admin' :
                           cleanEmail.includes('guest') || cleanEmail.includes('explorer') ? 'guest' : 'patient');
      const user = {
        id: 'u_' + Date.now(),
        email: cleanEmail,
        role: fallbackRole,
        name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
        avatar: cleanEmail.slice(0, 2).toUpperCase(),
        phone: '+91 98450 00000',
        profile: fallbackRole === 'patient' ? DEMO_USERS['patient@remotion.health'].profile : {}
      };
      const token = 'remotion_tok_' + Buffer.from(cleanEmail).toString('base64');
      return res.status(200).json({ success: true, token, user });
    }

    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 1b. Auth: Registration (Dynamic enrollment into Clinical Caseload)
  if (pathname === '/auth/register' && req.method === 'POST') {
    const { name, email, password, role = 'patient', condition = 'Post-Stroke Motor Rehabilitation', phone } = body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || 'New Patient').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    const newUserId = 'u_' + Date.now().toString(36);
    const newPtId = 'pt_' + Date.now().toString(36);

    const newUser = {
      id: newUserId,
      email: cleanEmail,
      role: role || 'patient',
      name: cleanName,
      avatar: cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PT',
      phone: phone || '+91 98450 00000',
      profile: {
        id: newPtId,
        user_id: newUserId,
        name: cleanName,
        age: 48,
        gender: 'Patient',
        condition: condition || 'Upper-Limb Motor Rehabilitation',
        recovery_level: 'Initial Evaluation (Stage 1)',
        affected_side: 'Right',
        xp: 150,
        streak: 1,
        level: 1,
        compliance: '100%',
        last_session: 'Today, Just Enrolled',
        primary_language: 'en',
        total_sessions: 1,
        avg_accuracy: 92.0,
        peak_rom: 55.0,
        active_prescriptions_count: 1
      }
    };

    DEMO_USERS[cleanEmail] = newUser;

    // If role is patient, register into Therapist Caseload Registry
    if (role === 'patient') {
      const existingIdx = PATIENTS.findIndex(p => p.email === cleanEmail);
      if (existingIdx >= 0) {
        PATIENTS[existingIdx] = { ...PATIENTS[existingIdx], ...newUser.profile };
      } else {
        PATIENTS.unshift(newUser.profile);
      }

      // Automatically assign initial tailored prescription
      PRESCRIPTIONS.unshift({
        id: 'rec_' + Date.now().toString(36),
        patient_id: newPtId,
        exercise_id: 'ex_squeeze_fill',
        exercise_name: 'Squeeze & Fill (Hand Grasp & ROM)',
        target_reps: 15,
        frequency: 'Daily',
        difficulty: 'Easy',
        instructions: `Welcome ${cleanName}. Perform active finger squeeze and release for ${condition}.`,
        clinical_notes: 'Initial clinical motor baseline assigned upon enrollment.',
        status: 'active'
      });
    }

    const token = 'remotion_tok_' + Buffer.from(cleanEmail).toString('base64');
    return res.status(200).json({ success: true, token, user: newUser });
  }

  // 2. Auth: Demo Switch
  if (pathname === '/auth/demo-switch' && req.method === 'POST') {
    const role = body.role || 'patient';
    const email = role === 'therapist' ? 'therapist@remotion.health' :
                  role === 'admin' ? 'admin@remotion.health' :
                  role === 'guest' ? 'guest@remotion.health' : 'patient@remotion.health';
    const user = DEMO_USERS[email];
    const token = 'remotion_tok_' + Buffer.from(email).toString('base64');
    return res.status(200).json({ success: true, token, user });
  }

  // 3. Auth: Current User
  if (pathname === '/auth/me') {
    return res.status(200).json({ user: DEMO_USERS['patient@remotion.health'] });
  }

  // 4. Patient Dashboard
  if (pathname === '/patient/dashboard') {
    const ptIdQuery = url.searchParams.get('patient_id') || 'pt_1';
    const targetPt = PATIENTS.find(p => p.id === ptIdQuery || p.user_id === ptIdQuery) || PATIENTS[0];
    let patientPrescriptions = PRESCRIPTIONS.filter(
      p => p.patient_id === targetPt.id && p.status !== 'inactive'
    );
    if (patientPrescriptions.length === 0) {
      patientPrescriptions = [
        {
          id: 'rec_' + targetPt.id + '_default',
          patient_id: targetPt.id,
          exercise_id: 'ex_squeeze_fill',
          exercise_name: 'Squeeze & Fill (Hand Grasp & ROM)',
          target_reps: 15,
          frequency: 'Daily',
          difficulty: 'Moderate',
          instructions: `Personalized neuro-motor grasp rehabilitation tailored for ${targetPt.name}.`,
          clinical_notes: `Targeting voluntary motor control for: ${targetPt.condition}.`,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
    }
    return res.status(200).json({
      patient: {
        ...targetPt,
        therapist_name: 'Dr. Rajesh Kulkarni, PT'
      },
      prescriptions: patientPrescriptions,
      stats: {
        total_sessions: targetPt.total_sessions || 6,
        avg_accuracy: targetPt.avg_accuracy || 94,
        avg_rom: targetPt.peak_rom || 82,
        avg_reaction_time: 340,
        avg_grip_strength: 88
      },
      recent_sessions: [
        {
          id: 'sess_1',
          exercise_name: 'Squeeze & Fill',
          start_time: new Date(Date.now() - 3600000 * 3).toISOString(),
          duration_seconds: 140,
          repetitions_completed: 15,
          accuracy_pct: 96,
          range_of_motion_deg: 84,
          notes: 'Full active grasp sustained across 15 repetitions.'
        },
        {
          id: 'sess_2',
          exercise_name: 'Reach & Touch 3D',
          start_time: new Date(Date.now() - 3600000 * 24).toISOString(),
          duration_seconds: 210,
          repetitions_completed: 20,
          accuracy_pct: 92,
          range_of_motion_deg: 79,
          notes: 'Good coordination in mid and far target reaches.'
        }
      ],
      badges: [
        { id: 'b_1', badge_code: 'SQ', name: 'Sponge Master', description: 'Completed 15 full clench-and-release repetitions.' },
        { id: 'b_2', badge_code: '7D', name: '7-Day Champion', description: 'Maintained 7 consecutive rehabilitation days.' }
      ],
      meetings: CLINICAL_MEETINGS
    });
  }

  // 4b. Clinical Meetings / Telehealth Appointments
  if (pathname === '/meetings') {
    if (req.method === 'POST') {
      const { patient_id = 'pt_1', title, scheduled_time, duration_minutes = 30, notes = '' } = body;
      const targetPt = PATIENTS.find(p => p.id === patient_id) || PATIENTS[0];
      const newMeeting = {
        id: 'mt_' + Date.now().toString(36),
        patient_id: targetPt.id,
        patient_name: targetPt.name,
        therapist_name: 'Dr. Rajesh Kulkarni, PT',
        title: title || 'Clinical Kinematics Review',
        scheduled_time: scheduled_time || 'Today at 05:00 PM',
        duration_minutes: Number(duration_minutes) || 30,
        room_id: 'remotion-room-' + targetPt.id,
        notes: notes || 'Clinical assessment of active range of motion and dexterity.',
        status: 'scheduled'
      };
      CLINICAL_MEETINGS.unshift(newMeeting);
      return res.status(200).json({ success: true, meeting: newMeeting, meetings: CLINICAL_MEETINGS });
    }
    return res.status(200).json({ meetings: CLINICAL_MEETINGS });
  }

  // 4c. Real-Time Patient & Clinician Messages (Strictly Per-Patient Isolated)
  if (pathname === '/messages' || pathname.startsWith('/messages')) {
    if (req.method === 'POST') {
      const {
        receiver_id = 'u_patient_1',
        message_text = '',
        target_language = 'hi',
        sender_id: customSenderId,
        sender_name: customSenderName,
        translated_text: customTranslation
      } = body;
      const isDoctor = req.headers.authorization && req.headers.authorization.includes('therapist');
      const sender_id = customSenderId || (isDoctor ? 'u_therapist_1' : 'u_patient_1');
      const sender_name = customSenderName || (sender_id === 'u_therapist_1' ? 'Dr. Rajesh Kulkarni, PT' : 'Asha Sharma');

      // Determine the isolated patient thread this message belongs to
      const patient_id = body.patient_id ||
        (receiver_id.startsWith('u_patient') || receiver_id.startsWith('pt_')
          ? (PATIENTS.find(p => p.id === receiver_id || p.user_id === receiver_id)?.id || 'pt_1')
          : (sender_id.startsWith('u_patient') || sender_id.startsWith('pt_')
            ? (PATIENTS.find(p => p.id === sender_id || p.user_id === sender_id)?.id || 'pt_1')
            : 'pt_1'));

      // Server deduplication: check if exact message was received within 60 seconds
      const existing = CLINICAL_MESSAGES.find(
        m => (body.id && m.id === body.id) ||
             (m.sender_id === sender_id && m.message_text.trim().toLowerCase() === message_text.trim().toLowerCase() && (Date.now() - new Date(m.created_at).getTime() < 60000))
      );

      const patientThread = CLINICAL_MESSAGES.filter(
        m => m.patient_id === patient_id ||
             (patient_id === 'pt_1' && (!m.patient_id || m.receiver_id === 'u_patient_1' || m.sender_id === 'u_patient_1'))
      );

      if (existing) {
        return res.status(200).json({ success: true, message: existing, messages: patientThread });
      }

      const newMsg = {
        id: body.id || ('msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
        patient_id,
        sender_id,
        sender_name,
        receiver_id,
        message_text,
        translated_text: customTranslation || message_text,
        created_at: body.created_at || new Date().toISOString()
      };
      CLINICAL_MESSAGES.push(newMsg);
      if (CLINICAL_MESSAGES.length > 500) CLINICAL_MESSAGES.shift();

      const updatedThread = CLINICAL_MESSAGES.filter(
        m => m.patient_id === patient_id ||
             (patient_id === 'pt_1' && (!m.patient_id || m.receiver_id === 'u_patient_1' || m.sender_id === 'u_patient_1'))
      );
      return res.status(200).json({ success: true, message: newMsg, messages: updatedThread });
    }

    // GET /messages or GET /messages/:patient_or_user_id (Separate thread per patient)
    const pathTarget = pathname.replace('/messages/', '').replace('/messages', '').trim();
    const queryPt = url.searchParams.get('patient_id') || url.searchParams.get('receiver_id') || url.searchParams.get('userId') || pathTarget;
    let filteredMessages = CLINICAL_MESSAGES;
    if (queryPt) {
      const targetPatient = PATIENTS.find(p => p.id === queryPt || p.user_id === queryPt) || { id: queryPt, user_id: queryPt };
      filteredMessages = CLINICAL_MESSAGES.filter(
        m => m.patient_id === targetPatient.id ||
             m.receiver_id === targetPatient.user_id ||
             m.sender_id === targetPatient.user_id ||
             (targetPatient.id === 'pt_1' && (!m.patient_id || m.receiver_id === 'u_patient_1' || m.sender_id === 'u_patient_1'))
      );
    }
    return res.status(200).json({ messages: filteredMessages });
  }

  // 4c-2. Remo AI Companion Rehabilitation Assistant
  if (pathname === '/remo/chat' || pathname.startsWith('/remo/chat')) {
    const userMsg = (body.message || '').trim().toLowerCase();
    const lang = body.language || 'en';
    
    let reply = '';
    let mascotState = 'encouraging';

    if (userMsg.includes('hi') || userMsg.includes('hello') || userMsg.includes('hey') || userMsg.includes('namaste')) {
      if (lang === 'kn') {
        reply = 'ನಮಸ್ಕಾರ! ನಾನು ರೆಮೋ, ನಿಮ್ಮ ಪುನರ್ವಸತಿ ಸಹಾಯಕ. ಇಂದಿನ ಮೋಟಾರ್ ವ್ಯಾಯಾಮ ಅಥವಾ ಥೆರಪಿಸ್ಟ್ ಸಮಾಲೋಚನೆಗೆ ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?';
      } else if (lang === 'hi') {
        reply = 'नमस्ते! मैं रेमो हूँ, आपका पुनर्वास सहायक। आज मैं आपके व्यायाम और रिकवरी में कैसे मदद कर सकता हूँ?';
      } else {
        reply = 'Hello! I am Remo, your rehabilitation companion. How can I assist your upper-limb recovery and exercises today?';
      }
      mascotState = 'happy';
    } else if (userMsg.includes('squeeze') || userMsg.includes('sponge') || userMsg.includes('grip') || userMsg.includes('hand')) {
      if (lang === 'kn') {
        reply = 'ಸ್ಕ್ವೀಜ್ ಮತ್ತು ಫಿಲ್ ವ್ಯಾಯಾಮ: ನಿಮ್ಮ ಕೈಯನ್ನು ಕ್ಯಾಮರಾ ಮುಂದೆ ತೆರೆದು, ನಂತರ ಬೆರಳುಗಳನ್ನು ನಿಧಾನವಾಗಿ ಒಳಕ್ಕೆ ಮಡಚಿ ಸ್ಪಂಜನ್ನು ಒತ್ತಿ. ಇದು ಬೆರಳುಗಳ ಚಲನೆ ಮತ್ತು ಬಲವನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.';
      } else if (lang === 'hi') {
        reply = 'स्क्वीज़ एंड फिल व्यायाम: अपने हाथ को पूरा खोलें और फिर धीरे-धीरे मुट्ठी भींचें। यह उंगलियों की सक्रिय गति और पकड़ शक्ति को बढ़ाता है।';
      } else {
        reply = 'Squeeze & Fill Exercise: Position your hand in front of the camera, open your fingers fully, and slowly clench into a fist to compress the virtual sponge. This strengthens flexor muscles and restores functional grip.';
      }
      mascotState = 'encouraging';
    } else if (userMsg.includes('reach') || userMsg.includes('touch') || userMsg.includes('shoulder')) {
      reply = 'Reach & Touch Exercise: Extend your affected arm towards the 3D illuminated targets. Focus on keeping your shoulder relaxed without compensatory trunk lean. Dr. Rajesh monitors your spatial accuracy and range of motion.';
      mascotState = 'encouraging';
    } else if (userMsg.includes('pain') || userMsg.includes('hurt') || userMsg.includes('tired') || userMsg.includes('fatigue')) {
      reply = 'Clinical Notice: If you experience acute pain (above 3/10) or significant fatigue, please stop the exercise immediately, rest your arm on a supported surface, and alert Dr. Rajesh via Clinician Chat.';
      mascotState = 'concerned';
    } else if (userMsg.includes('vr') || userMsg.includes('headset') || userMsg.includes('quest')) {
      reply = 'To use VR mode: Put on your Meta Quest 3 or Apple Vision Pro headset, open the browser, and navigate to this workspace. Click "Enter VR" to engage immersive 6DOF rehabilitation!';
      mascotState = 'encouraging';
    } else {
      if (lang === 'kn') {
        reply = 'ನಿಮ್ಮ ಚೇತರಿಕೆಯ ಗುರಿಗಳನ್ನು ತಲುಪಲು ನಿಮ್ಮ ದೈನಂದಿನ ಸೂಚಿತ ವ್ಯಾಯಾಮಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ. ಹೆಚ್ಚಿನ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ಡಾ. ರಾಜೇಶ್ ಅವರೊಂದಿಗೆ ವೀಡಿಯೊ ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸಿ.';
      } else if (lang === 'hi') {
        reply = 'अपनी दैनिक फिजियोथेरेपी समय पर पूरी करें। उंगलियों और बांह के समन्वय में सुधार हो रहा है। किसी भी सवाल के लिए क्लिनिशियन चैट का उपयोग करें।';
      } else {
        reply = 'I am here to guide your rehabilitation. Complete your daily prescribed exercises (Squeeze & Fill and Reach & Touch), track your ROM progress, or connect with Dr. Rajesh via Video Meeting.';
      }
    }

    return res.status(200).json({ success: true, reply, mascotState });
  }

  // 4d. Rehabilitation Games Catalog (Full 3D WebGL Games)
  if (pathname === '/games' || pathname.startsWith('/games')) {
    const gId = pathname.replace('/games/', '').replace('/games', '').trim();
    if (gId) {
      const found = ALL_REHAB_GAMES.find(g => g.id === gId || g.id === ('gm_' + gId) || g.id.includes(gId));
      if (found) return res.status(200).json({ success: true, game: found });
    }
    return res.status(200).json({ success: true, games: ALL_REHAB_GAMES });
  }

  // WebRTC Multi-Tier Signaling Bridge
  if (pathname === '/webrtc/signal' || pathname.startsWith('/webrtc/signal')) {
    if (req.method === 'POST') {
      const signalEntry = {
        id: 'sig_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        ...body,
        roomId: body.roomId || 'remotion-room-pt_1',
        senderId: body.senderId || 'peer',
        type: body.type || 'ping',
        userName: body.userName || '',
        role: body.role || '',
        timestamp: Date.now()
      };
      WEBRTC_SIGNALS.push(signalEntry);
      if (WEBRTC_SIGNALS.length > 500) WEBRTC_SIGNALS.shift();
      return res.status(200).json({ success: true, signal: signalEntry });
    }
    // GET: Query signals for this room
    const targetRoomId = url.searchParams.get('roomId') || 'remotion-room-pt_1';
    const excludeSender = url.searchParams.get('excludeSender') || '';
    const since = parseInt(url.searchParams.get('since') || '0', 10);
    const windowStart = since > 0 ? Math.max(since, Date.now() - 30000) : (Date.now() - 30000);
    const matched = WEBRTC_SIGNALS.filter(
      s => s.roomId === targetRoomId && s.senderId !== excludeSender && s.timestamp >= windowStart
    );
    return res.status(200).json({ success: true, signals: matched.slice(-30) });
  }

  // Real-Time Telehealth Call Alerts (rings on recipient portal immediately)
  if (pathname === '/telehealth/call-alert' || pathname.startsWith('/telehealth/call-alert')) {
    if (req.method === 'POST') {
      const alertData = {
        id: 'alert_' + Date.now().toString(36),
        ...body,
        timestamp: Date.now()
      };
      ACTIVE_CALL_ALERTS = ACTIVE_CALL_ALERTS.filter(a => Date.now() - a.timestamp < 60000);
      ACTIVE_CALL_ALERTS.push(alertData);
      return res.status(200).json({ success: true, alert: alertData });
    }
    if (req.method === 'DELETE') {
      const alertId = url.searchParams.get('id') || body.id;
      if (alertId) {
        ACTIVE_CALL_ALERTS = ACTIVE_CALL_ALERTS.filter(a => a.id !== alertId);
      } else {
        ACTIVE_CALL_ALERTS = [];
      }
      return res.status(200).json({ success: true });
    }
    const targetRole = url.searchParams.get('targetRole') || '';
    const excludeCallerRole = url.searchParams.get('excludeCallerRole') || '';
    const pendingAlerts = ACTIVE_CALL_ALERTS.filter(
      a => (Date.now() - a.timestamp < 45000) &&
           (!targetRole || a.targetRole === targetRole) &&
           (!excludeCallerRole || a.callerRole !== excludeCallerRole)
    );
    return res.status(200).json({ success: true, alerts: pendingAlerts });
  }

  // 5. Therapist Patients Caseload & Registration
  if (pathname === '/therapist/patients') {
    if (req.method === 'POST') {
      const {
        name,
        condition = 'Post-Stroke Left Upper Limb Hemiparesis',
        affected_side = 'Left Upper Limb',
        level = 3,
        age = 52,
        gender = 'Not Specified',
        primary_language = 'en',
        emergency_contact = '+91 98450 12345',
        email = '',
        notes = ''
      } = body;

      const newId = 'pt_' + Date.now().toString(36);
      const newPt = {
        id: newId,
        user_id: 'u_' + newId,
        name: (name || 'New Patient').trim(),
        age: Number(age) || 52,
        gender: gender || 'Not Specified',
        condition: (condition || 'Post-Stroke Left Upper Limb Hemiparesis').trim(),
        recovery_level: typeof level === 'string' && level.includes('Stage') ? level : `Stage ${level} Recovery`,
        affected_side: affected_side || 'Left Upper Limb',
        primary_language: primary_language || 'en',
        emergency_contact: emergency_contact || '+91 98450 12345',
        total_sessions: 1,
        avg_accuracy: 92.0,
        peak_rom: 62.0,
        level: Number(parseInt(level, 10)) || 3,
        streak: 1,
        compliance: '100%',
        active_prescriptions_count: 2,
        email: email || `${(name || 'patient').toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
        notes: notes || `Clinical record initialized for ${(name || 'Patient').trim()}. Condition: ${condition}.`,
        created_at: new Date().toISOString()
      };

      PATIENTS.unshift(newPt);

      // Tailored default prescriptions for this patient
      const ex1 = {
        id: 'rx_' + newId + '_sq',
        patient_id: newId,
        patient_name: newPt.name,
        exercise_id: 'ex_squeeze_fill',
        exercise_name: 'Squeeze & Fill (Hand Grasp & ROM)',
        target_reps: 15,
        frequency: 'Daily',
        difficulty: 'Moderate',
        instructions: `Active finger flexion and extension routine customized for ${newPt.name}.`,
        clinical_notes: `Prescribed based on condition: ${newPt.condition}.`,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const ex2 = {
        id: 'rx_' + newId + '_reach',
        patient_id: newId,
        patient_name: newPt.name,
        exercise_id: 'ex_reach_touch',
        exercise_name: 'Reach & Touch (3D Spatial Coordination)',
        target_reps: 20,
        frequency: 'Daily',
        difficulty: 'Moderate',
        instructions: 'Spatial reaching targets to rebuild functional shoulder and elbow extension.',
        clinical_notes: 'Assess movement latency and trunk compensation.',
        status: 'active',
        created_at: new Date().toISOString()
      };

      PRESCRIPTIONS.unshift(ex1, ex2);

      // Baseline evaluation session
      SESSIONS.unshift({
        id: 'sess_' + newId + '_base',
        patient_id: newId,
        patient_name: newPt.name,
        exercise_id: 'ex_squeeze_fill',
        exercise_name: 'Squeeze & Fill',
        start_time: new Date().toISOString(),
        duration_seconds: 120,
        repetitions_completed: 10,
        accuracy_pct: 88,
        range_of_motion_deg: 55,
        notes: 'Initial clinical assessment baseline established.'
      });

      return res.status(200).json({ success: true, patient: newPt, patients: PATIENTS });
    }

    return res.status(200).json({ patients: PATIENTS });
  }

  // 6. Therapist Patient Details & Record Updates
  if (pathname.startsWith('/therapist/patients/')) {
    const ptId = pathname.split('/').pop();
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const idx = PATIENTS.findIndex(p => p.id === ptId);
      if (idx !== -1) {
        PATIENTS[idx] = {
          ...PATIENTS[idx],
          ...body,
          updated_at: new Date().toISOString()
        };
        return res.status(200).json({ success: true, patient: PATIENTS[idx], patients: PATIENTS });
      }
      return res.status(404).json({ error: 'Patient not found' });
    }

    let patient = PATIENTS.find(p => p.id === ptId);
    if (!patient) {
      if (ptId === 'pt_1') {
        patient = PATIENTS[0];
      } else {
        patient = {
          id: ptId,
          user_id: 'u_' + ptId,
          name: 'Patient ' + ptId.replace('pt_', ''),
          age: 52,
          gender: 'Not Specified',
          condition: 'Post-Stroke Left Upper Limb Hemiparesis',
          recovery_level: 'Stage 3 Recovery',
          affected_side: 'Left Upper Limb',
          primary_language: 'en',
          emergency_contact: '+91 98450 12345',
          total_sessions: 1,
          avg_accuracy: 92.0,
          peak_rom: 62.0,
          level: 3,
          streak: 1,
          compliance: '100%',
          active_prescriptions_count: 2,
          notes: 'Clinical record initialized.'
        };
        PATIENTS.unshift(patient);
      }
    }

    let prescriptions = PRESCRIPTIONS.filter(p => p.patient_id === patient.id);
    if (prescriptions.length === 0) {
      prescriptions = [
        {
          id: 'rx_' + patient.id + '_sq',
          patient_id: patient.id,
          patient_name: patient.name,
          exercise_id: 'ex_squeeze_fill',
          exercise_name: 'Squeeze & Fill (Hand Grasp & ROM)',
          target_reps: 15,
          frequency: 'Daily',
          difficulty: 'Moderate',
          instructions: `Active finger flexion routine customized for ${patient.name}.`,
          clinical_notes: `Prescribed based on condition: ${patient.condition}.`,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 'rx_' + patient.id + '_reach',
          patient_id: patient.id,
          patient_name: patient.name,
          exercise_id: 'ex_reach_touch',
          exercise_name: 'Reach & Touch (3D Spatial Coordination)',
          target_reps: 20,
          frequency: 'Daily',
          difficulty: 'Moderate',
          instructions: 'Spatial reaching targets to rebuild functional shoulder and elbow extension.',
          clinical_notes: 'Assess movement latency and trunk compensation.',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      PRESCRIPTIONS.unshift(...prescriptions);
    }

    return res.status(200).json({
      patient,
      prescriptions,
      recovery_metrics: [
        { session: 'Baseline', rom: 42, accuracy: 72 },
        { session: 'Session 1', rom: 55, accuracy: 82 },
        { session: 'Current', rom: patient.peak_rom || 62, accuracy: patient.avg_accuracy || 92 }
      ]
    });
  }

  // 7. Admin Dashboard & System Summary
  if (pathname === '/admin/dashboard' || pathname === '/admin/system' || pathname === '/system/summary') {
    return res.status(200).json({
      system: {
        active_users: 8,
        active_patients: 4,
        active_therapists: 2,
        total_sessions_completed: 42,
        server_uptime: '99.98%',
        webrtc_active_streams: 1,
        database_engine: 'SQLite WASM (Persistent)'
      },
      patients: PATIENTS,
      audit_logs: [
        { id: 'aud_1', action: 'PRESCRIPTION_UPDATED', entity: 'therapist_recommendations', details: 'Status: active', created_at: new Date().toISOString() },
        { id: 'aud_2', action: 'TELEHEALTH_SESSION_JOINED', entity: 'meetings', details: 'Room: remotion-room-pt_1', created_at: new Date(Date.now() - 1800000).toISOString() }
      ]
    });
  }

  // 8. Record Completed Session
  if (pathname === '/patient/sessions' && req.method === 'POST') {
    return res.status(200).json({
      success: true,
      session_id: 'sess_' + Date.now(),
      xp_gained: 65,
      new_xp: 545,
      new_level: 4
    });
  }

  // 9. Prescriptions Management
  if (pathname === '/therapist/prescriptions' || pathname.startsWith('/therapist/prescriptions')) {
    if (req.method === 'POST') {
      const {
        patient_id = 'pt_1',
        exercise_id = 'ex_squeeze_fill',
        exercise_name,
        target_reps = 15,
        frequency = 'Daily',
        difficulty = 'Moderate',
        instructions = '',
        clinical_notes = ''
      } = body;
      const targetPt = PATIENTS.find(p => p.id === patient_id) || PATIENTS[0];
      const newRec = {
        id: 'rec_' + Date.now().toString(36),
        patient_id: targetPt.id,
        exercise_id,
        exercise_name: exercise_name || (exercise_id === 'ex_squeeze_fill' ? 'Squeeze & Fill (Hand Grasp & ROM)' :
                                          exercise_id === 'ex_reach_touch' ? 'Reach & Touch (3D Spatial Coordination)' : 'Hand Function Check'),
        target_reps: Number(target_reps) || 15,
        frequency: frequency || 'Daily',
        difficulty: difficulty || 'Moderate',
        instructions: instructions || 'Follow clinical guidance.',
        clinical_notes: clinical_notes || `Prescribed for ${targetPt.name} based on condition: ${targetPt.condition}.`,
        status: 'active',
        created_at: new Date().toISOString()
      };
      PRESCRIPTIONS.unshift(newRec);
      if (targetPt) targetPt.active_prescriptions_count = (targetPt.active_prescriptions_count || 0) + 1;
      return res.status(200).json({ success: true, prescription: newRec, prescriptions: PRESCRIPTIONS });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const recId = pathname.split('/').pop();
      const rec = PRESCRIPTIONS.find(p => p.id === recId);
      if (rec) {
        if (body.status) rec.status = body.status;
        if (body.target_reps !== undefined) rec.target_reps = Number(body.target_reps);
        if (body.frequency) rec.frequency = body.frequency;
        if (body.difficulty) rec.difficulty = body.difficulty;
        if (body.instructions) rec.instructions = body.instructions;
        if (body.clinical_notes) rec.clinical_notes = body.clinical_notes;
        rec.updated_at = new Date().toISOString();
      }
      return res.status(200).json({ success: true, prescription: rec, prescriptions: PRESCRIPTIONS });
    }

    if (req.method === 'DELETE') {
      const recId = pathname.split('/').pop();
      PRESCRIPTIONS = PRESCRIPTIONS.filter(p => p.id !== recId);
      return res.status(200).json({ success: true, prescriptions: PRESCRIPTIONS });
    }

    const patientId = url.searchParams.get('patient_id');
    const filtered = patientId ? PRESCRIPTIONS.filter(p => p.patient_id === patientId) : PRESCRIPTIONS;
    return res.status(200).json({ prescriptions: filtered });
  }

  // 10. Neural Translation
  if (pathname === '/translate' && req.method === 'POST') {
    const { text, from_lang, to_lang } = body;
    return res.status(200).json({
      translated_text: text,
      source_language: from_lang || 'hi',
      target_language: to_lang || 'en'
    });
  }

  // Fallback 200 for any other API route
  return res.status(200).json({ success: true, message: 'ReMotion API endpoint active' });
}
