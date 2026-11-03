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

const PATIENTS = [
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
    primary_language: 'kn',
    total_sessions: 14,
    avg_accuracy: 96.5,
    peak_rom: 95.0,
    active_prescriptions_count: 4
  }
];

const PRESCRIPTIONS = [
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
    message_text: 'Good morning Asha. Please focus on slow, controlled finger release during Squeeze & Fill.',
    translated_text: 'सुप्रभात आशा। कृपया निचोड़ें और भरें के दौरान धीमी, नियंत्रित उंगली छोड़ने पर ध्यान दें।',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'msg_2',
    sender_id: 'u_patient_1',
    sender_name: 'Asha Sharma',
    receiver_id: 'u_therapist_1',
    message_text: 'Thank you doctor, I felt much less fatigue in my fingers today.',
    translated_text: 'धन्यवाद डॉक्टर, आज मुझे अपनी उंगलियों में बहुत कम थकान महसूस हुई।',
    created_at: new Date(Date.now() - 3600000).toISOString()
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
    const { email, password } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check pre-configured demo users
    const matched = DEMO_USERS[cleanEmail];
    if (matched) {
      const token = 'remotion_tok_' + Buffer.from(cleanEmail).toString('base64');
      return res.status(200).json({
        success: true,
        token,
        user: matched
      });
    }

    // Dynamic fallback for any valid formatted email
    if (cleanEmail.includes('@')) {
      const fallbackRole = cleanEmail.includes('therapist') ? 'therapist' :
                           cleanEmail.includes('admin') ? 'admin' :
                           cleanEmail.includes('guest') || cleanEmail.includes('explorer') ? 'guest' : 'patient';
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
    const patient = DEMO_USERS['patient@remotion.health'].profile;
    return res.status(200).json({
      patient: {
        ...patient,
        name: 'Asha Sharma',
        therapist_name: 'Dr. Rajesh Kulkarni, PT'
      },
      prescriptions: PRESCRIPTIONS,
      stats: {
        total_sessions: 6,
        avg_accuracy: 94,
        avg_rom: 82,
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

  // 4c. Real-Time Patient & Clinician Messages
  if (pathname === '/messages' || pathname.startsWith('/messages')) {
    if (req.method === 'POST') {
      const { receiver_id = 'u_patient_1', message_text = '', target_language = 'hi' } = body;
      const isDoctor = req.headers.authorization && req.headers.authorization.includes('therapist');
      const sender_id = isDoctor ? 'u_therapist_1' : 'u_patient_1';
      const sender_name = isDoctor ? 'Dr. Rajesh Kulkarni, PT' : 'Asha Sharma';
      const newMsg = {
        id: 'msg_' + Date.now().toString(36),
        sender_id,
        sender_name,
        receiver_id,
        message_text,
        translated_text: message_text,
        created_at: new Date().toISOString()
      };
      CLINICAL_MESSAGES.push(newMsg);
      return res.status(200).json({ success: true, message: newMsg, messages: CLINICAL_MESSAGES });
    }
    return res.status(200).json({ messages: CLINICAL_MESSAGES });
  }

  // WebRTC Multi-Tier Signaling Bridge
  if (pathname === '/webrtc/signal' || pathname.startsWith('/webrtc/signal')) {
    if (req.method === 'POST') {
      const { roomId = 'remotion-room-pt_1', senderId = 'peer', type = 'ping', data = null, userName = '', role = '' } = body;
      const signalEntry = {
        id: 'sig_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        roomId,
        senderId,
        type,
        data,
        userName,
        role,
        timestamp: Date.now()
      };
      WEBRTC_SIGNALS.push(signalEntry);
      if (WEBRTC_SIGNALS.length > 250) WEBRTC_SIGNALS.shift();
      return res.status(200).json({ success: true, signal: signalEntry });
    }
    // GET: Query signals for this room
    const targetRoomId = url.searchParams.get('roomId') || 'remotion-room-pt_1';
    const excludeSender = url.searchParams.get('excludeSender') || '';
    const since = parseInt(url.searchParams.get('since') || '0', 10);
    const matched = WEBRTC_SIGNALS.filter(
      s => s.roomId === targetRoomId && s.senderId !== excludeSender && s.timestamp > since
    );
    return res.status(200).json({ success: true, signals: matched });
  }

  // 5. Therapist Patients Caseload
  if (pathname === '/therapist/patients') {
    return res.status(200).json({ patients: PATIENTS });
  }

  // 6. Therapist Patient Details
  if (pathname.startsWith('/therapist/patients/')) {
    const ptId = pathname.split('/').pop();
    const patient = PATIENTS.find(p => p.id === ptId) || PATIENTS[0];
    return res.status(200).json({
      patient,
      prescriptions: PRESCRIPTIONS.filter(p => p.patient_id === patient.id || p.patient_id === 'pt_1'),
      recovery_metrics: [
        { session: 'Baseline', rom: 45, accuracy: 72 },
        { session: 'Week 1', rom: 58, accuracy: 80 },
        { session: 'Week 2', rom: 68, accuracy: 86 },
        { session: 'Week 3', rom: 76, accuracy: 91 },
        { session: 'Current', rom: 82, accuracy: 94 }
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

  // 9. Prescriptions
  if (pathname.startsWith('/therapist/prescriptions')) {
    return res.status(200).json({ success: true, message: 'Prescription updated' });
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
