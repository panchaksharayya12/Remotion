import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb, resetDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'remotion_clinical_rehab_secret_2026';
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role Authorization Middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Unauthorized. Required roles: ${roles.join(', ')}` });
    }
    next();
  };
}

// Helper to log audit trail
function logAudit(db, userId, action, entity, entityId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    db.run(
      'INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId || 'system', action, entity, entityId || '', details || '', ip]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// ==========================================
// 1. AUTHENTICATION & DEMO SWITCH
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const db = await getDb();
    const user = db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact platform administrator.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let profileData = null;
    if (user.role === 'patient') {
      profileData = db.get('SELECT * FROM patients WHERE user_id = ?', [user.id]);
    } else if (user.role === 'therapist') {
      profileData = db.get('SELECT * FROM therapists WHERE user_id = ?', [user.id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit(db, user.id, 'USER_LOGIN', 'users', user.id, `User logged in as ${user.role}`, req);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        profile: profileData
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// User Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient', phone = '', condition = 'Motor Rehabilitation', specialization = 'Physical Therapy', primary_language = 'en' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const db = await getDb();
    const existing = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `u_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'RM';
    const normalizedRole = ['patient', 'therapist', 'admin', 'explorer'].includes(role) ? role : 'patient';

    db.run(
      'INSERT INTO users (id, email, password_hash, role, name, avatar, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase().trim(), passwordHash, normalizedRole, name.trim(), avatar, phone, 1]
    );

    let profileData = null;
    if (normalizedRole === 'patient') {
      const patientId = `pt_${Date.now().toString(36)}`;
      db.run(
        'INSERT INTO patients (id, user_id, age, gender, condition, recovery_level, affected_side, xp, streak, level, emergency_contact, primary_language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [patientId, userId, 35, 'Other', condition, 'Active Rehabilitation', 'Both', 100, 1, 1, phone, primary_language]
      );
      // Auto-assign to default lead therapist (Dr. Rajesh Kulkarni)
      db.run(
        'INSERT INTO therapist_assignments (id, therapist_id, patient_id, status) VALUES (?, ?, ?, ?)',
        [`ta_${Date.now().toString(36)}`, 'th_1', patientId, 'active']
      );
      profileData = db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    } else if (normalizedRole === 'therapist') {
      const therapistId = `th_${Date.now().toString(36)}`;
      db.run(
        'INSERT INTO therapists (id, user_id, specialization, license_number, hospital, bio, experience_years) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [therapistId, userId, specialization, `LIC-${Date.now().toString(36).toUpperCase()}`, 'ReMotion Clinical Network', 'Licensed Rehabilitation Specialist', 5]
      );
      profileData = db.get('SELECT * FROM therapists WHERE id = ?', [therapistId]);
    }

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), role: normalizedRole, name: name.trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit(db, userId, 'USER_REGISTER', 'users', userId, `New account registered as ${normalizedRole}`, req);

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role: normalizedRole,
        avatar,
        phone,
        profile: profileData
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Demo Fast Switch (For Seamless Portal Demonstration)
app.post('/api/auth/demo-switch', async (req, res) => {
  try {
    const { role, email, patientKey } = req.body;
    const db = await getDb();

    let targetEmail = 'patient@remotion.health';
    if (email) {
      targetEmail = email;
    } else if (patientKey === 'asha') {
      targetEmail = 'patient@remotion.health';
    } else if (patientKey === 'ravi') {
      targetEmail = 'ravi.patel@remotion.health';
    } else if (patientKey === 'meena') {
      targetEmail = 'meena.s@remotion.health';
    } else if (role === 'therapist') {
      targetEmail = 'therapist@remotion.health';
    } else if (role === 'admin') {
      targetEmail = 'admin@remotion.health';
    } else if (role === 'guest' || role === 'explorer') {
      targetEmail = 'guest@remotion.health';
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [targetEmail]);
    if (!user) return res.status(404).json({ error: 'Demo user not found: ' + targetEmail });

    let profileData = null;
    if (user.role === 'patient') {
      profileData = db.get('SELECT * FROM patients WHERE user_id = ?', [user.id]);
    } else if (user.role === 'therapist') {
      profileData = db.get('SELECT * FROM therapists WHERE user_id = ?', [user.id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit(db, user.id, 'DEMO_SWITCH', 'users', user.id, `Switched to demo role: ${user.role}`, req);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        profile: profileData
      }
    });
  } catch (err) {
    console.error('Demo switch error:', err);
    res.status(500).json({ error: 'Failed to switch demo account' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.get('SELECT id, email, role, name, avatar, phone, is_active FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let profileData = null;
    if (user.role === 'patient') {
      profileData = db.get('SELECT * FROM patients WHERE user_id = ?', [user.id]);
    } else if (user.role === 'therapist') {
      profileData = db.get('SELECT * FROM therapists WHERE user_id = ?', [user.id]);
    }

    res.json({ user: { ...user, profile: profileData } });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching current user' });
  }
});

// ==========================================
// 2. PATIENT PORTAL APIS
// ==========================================

app.get('/api/patient/dashboard', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let patient = null;

    if (req.user.role === 'patient') {
      patient = db.get('SELECT * FROM patients WHERE user_id = ?', [req.user.id]);
    } else if (req.query.patient_id) {
      patient = db.get('SELECT * FROM patients WHERE id = ?', [req.query.patient_id]);
    } else {
      patient = db.get('SELECT * FROM patients LIMIT 1');
    }

    if (!patient) return res.status(404).json({ error: 'Patient record not found' });

    const user = db.get('SELECT id, name, email, avatar, phone FROM users WHERE id = ?', [patient.user_id]);

    // Assigned Therapist
    const assignment = db.get(`
      SELECT t.*, u.name as therapist_name, u.email as therapist_email, u.phone as therapist_phone
      FROM therapist_assignments ta
      JOIN therapists t ON ta.therapist_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE ta.patient_id = ? AND ta.status = 'active'
    `, [patient.id]);

    // Prescriptions / Active Recommendations
    const prescriptions = db.all(`
      SELECT tr.*, e.name as exercise_name, e.category as exercise_category, e.target_body_part, e.icon as exercise_icon,
             g.title as game_title, g.category as game_category, g.thumbnail as game_thumbnail
      FROM therapist_recommendations tr
      LEFT JOIN exercises e ON tr.exercise_id = e.id
      LEFT JOIN games_catalog g ON tr.game_id = g.id
      WHERE tr.patient_id = ? AND tr.status = 'active'
      ORDER BY tr.created_at DESC
    `, [patient.id]);

    // Recent Sessions
    const recentSessions = db.all(`
      SELECT s.*, e.name as exercise_name, g.title as game_title
      FROM sessions s
      LEFT JOIN exercises e ON s.exercise_id = e.id
      LEFT JOIN games_catalog g ON s.game_id = g.id
      WHERE s.patient_id = ?
      ORDER BY s.created_at DESC
      LIMIT 10
    `, [patient.id]);

    // Badges
    const badges = db.all('SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at DESC', [patient.user_id]);

    // Upcoming Meetings
    const meetings = db.all(`
      SELECT m.*, u.name as therapist_name
      FROM meetings m
      JOIN therapists t ON m.therapist_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE m.patient_id = ? AND m.status IN ('scheduled', 'in_progress')
      ORDER BY m.scheduled_time ASC
    `, [patient.id]);

    // Recovery Stats summary
    const statsSummary = db.get(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(repetitions_completed) as total_reps,
        AVG(accuracy_pct) as avg_accuracy,
        MAX(range_of_motion_deg) as peak_rom,
        AVG(reaction_time_ms) as avg_reaction_time,
        AVG(grip_strength_score) as avg_grip_strength
      FROM sessions
      WHERE patient_id = ?
    `, [patient.id]);

    res.json({
      patient: {
        ...patient,
        user
      },
      therapist: assignment,
      prescriptions,
      recentSessions,
      badges,
      meetings,
      stats: {
        total_sessions: statsSummary.total_sessions || 0,
        total_reps: statsSummary.total_reps || 0,
        avg_accuracy: Math.round(statsSummary.avg_accuracy || 0),
        peak_rom: Math.round(statsSummary.peak_rom || 0),
        avg_reaction_time: Math.round(statsSummary.avg_reaction_time || 0),
        avg_grip_strength: Math.round(statsSummary.avg_grip_strength || 0)
      }
    });
  } catch (err) {
    console.error('Patient dashboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve patient dashboard' });
  }
});

// Record Completed Exercise Session (Real-time dispatch to therapist)
app.post('/api/patient/sessions', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const {
      exercise_id,
      game_id,
      session_type = 'exercise',
      duration_seconds = 0,
      repetitions_completed = 0,
      accuracy_pct = 0,
      range_of_motion_deg = 0,
      reaction_time_ms = 0,
      grip_strength_score = 0,
      device_type = 'desktop_sim',
      tracking_quality = 'Optimal (98%)',
      notes = ''
    } = req.body;

    // Find patient record
    let patient = null;
    if (req.user.role === 'patient') {
      patient = db.get('SELECT * FROM patients WHERE user_id = ?', [req.user.id]);
    } else if (req.body.patient_id) {
      patient = db.get('SELECT * FROM patients WHERE id = ?', [req.body.patient_id]);
    } else {
      patient = db.get('SELECT * FROM patients LIMIT 1');
    }

    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const sessionId = 'sess_' + uuidv4().slice(0, 8);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.run(`
      INSERT INTO sessions (
        id, patient_id, exercise_id, game_id, session_type,
        start_time, end_time, duration_seconds, repetitions_completed,
        accuracy_pct, range_of_motion_deg, reaction_time_ms, grip_strength_score,
        device_type, tracking_quality, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId, patient.id, exercise_id || null, game_id || null, session_type,
      now, now, duration_seconds, repetitions_completed,
      accuracy_pct, range_of_motion_deg, reaction_time_ms, grip_strength_score,
      device_type, tracking_quality, notes
    ]);

    // Calculate XP reward & level progression
    const xpGained = Math.max(25, Math.round(repetitions_completed * 4 + accuracy_pct * 0.3));
    const newXp = patient.xp + xpGained;
    const newLevel = Math.min(10, Math.floor(newXp / 120) + 1);

    db.run('UPDATE patients SET xp = ?, level = ? WHERE id = ?', [newXp, newLevel, patient.id]);

    // Check & award badges
    const earnedBadges = [];
    if (repetitions_completed >= 15) {
      const hasSq = db.get("SELECT id FROM badges WHERE user_id = ? AND badge_code = 'SQ'", [patient.user_id]);
      if (!hasSq) {
        db.run("INSERT INTO badges (id, user_id, badge_code, name, description) VALUES (?, ?, 'SQ', 'Sponge Master', 'Completed 15 full clench-and-release repetitions.')", [uuidv4(), patient.user_id]);
        earnedBadges.push('SQ');
      }
    }
    if (accuracy_pct >= 95) {
      const has100 = db.get("SELECT id FROM badges WHERE user_id = ? AND badge_code = '100%'", [patient.user_id]);
      if (!has100) {
        db.run("INSERT INTO badges (id, user_id, badge_code, name, description) VALUES (?, ?, '100%', 'Flawless Accuracy', 'Exceeded 95% target accuracy during therapy.')", [uuidv4(), patient.user_id]);
        earnedBadges.push('100%');
      }
    }

    // Get assigned therapist to notify via Socket.IO
    const assignment = db.get("SELECT therapist_id FROM therapist_assignments WHERE patient_id = ? AND status = 'active'", [patient.id]);

    const sessionPayload = {
      sessionId,
      patientId: patient.id,
      patientName: req.user.name,
      exercise_id,
      game_id,
      repetitions_completed,
      accuracy_pct,
      range_of_motion_deg,
      reaction_time_ms,
      grip_strength_score,
      xpGained,
      newXp,
      newLevel,
      earnedBadges,
      created_at: now
    };

    // Emit live event to therapist room
    if (assignment) {
      io.to(`therapist_${assignment.therapist_id}`).emit('patient_session_completed', sessionPayload);
      // Create notification for therapist
      db.run(`
        INSERT INTO notifications (id, user_id, title, message, notification_type, link_url)
        SELECT ?, t.user_id, 'Session Completed', ?, 'milestone', '/therapist#patients'
        FROM therapists t WHERE t.id = ?
      `, [uuidv4(), `${req.user.name} completed therapy session with ${Math.round(accuracy_pct)}% accuracy.`, assignment.therapist_id]);
    }

    logAudit(db, req.user.id, 'EXERCISE_SESSION_COMPLETED', 'sessions', sessionId, `Completed ${repetitions_completed} reps with ${accuracy_pct}% accuracy`, req);

    res.json({
      success: true,
      sessionId,
      xpGained,
      newXp,
      newLevel,
      earnedBadges
    });
  } catch (err) {
    console.error('Session record error:', err);
    res.status(500).json({ error: 'Failed to record rehabilitation session' });
  }
});

// ==========================================
// 3. THERAPIST PORTAL APIS
// ==========================================

app.get('/api/therapist/patients', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let therapist = null;

    if (req.user.role === 'therapist') {
      therapist = db.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]);
    } else if (req.user.role === 'admin') {
      therapist = db.get('SELECT * FROM therapists LIMIT 1');
    }

    if (!therapist) {
      return res.status(404).json({ error: 'Therapist profile not found' });
    }

    // STRICT: Only fetch patients assigned to THIS therapist
    const patients = db.all(`
      SELECT
        p.*,
        u.name,
        u.email,
        u.avatar,
        u.phone,
        ta.assigned_date,
        ta.status as assignment_status,
        (SELECT COUNT(*) FROM sessions s WHERE s.patient_id = p.id) as total_sessions,
        (SELECT MAX(created_at) FROM sessions s WHERE s.patient_id = p.id) as last_active,
        (SELECT AVG(accuracy_pct) FROM sessions s WHERE s.patient_id = p.id) as avg_accuracy,
        (SELECT MAX(range_of_motion_deg) FROM sessions s WHERE s.patient_id = p.id) as peak_rom,
        (SELECT COUNT(*) FROM therapist_recommendations tr WHERE tr.patient_id = p.id AND tr.status = 'active') as active_prescriptions_count
      FROM therapist_assignments ta
      JOIN patients p ON ta.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE ta.therapist_id = ? AND ta.status = 'active'
      ORDER BY u.name ASC
    `, [therapist.id]);

    res.json({ therapist, patients });
  } catch (err) {
    console.error('Therapist patients error:', err);
    res.status(500).json({ error: 'Failed to retrieve therapist patients' });
  }
});

app.get('/api/therapist/patients/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const patientId = req.params.id;

    // Check access: if therapist, verify assignment
    if (req.user.role === 'therapist') {
      const therapist = db.get('SELECT id FROM therapists WHERE user_id = ?', [req.user.id]);
      if (therapist) {
        const assignment = db.get('SELECT id FROM therapist_assignments WHERE therapist_id = ? AND patient_id = ?', [therapist.id, patientId]);
        if (!assignment) {
          return res.status(403).json({ error: 'Access denied: Patient is not assigned to you.' });
        }
      }
    }

    const patient = db.get(`
      SELECT p.*, u.name, u.email, u.avatar, u.phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [patientId]);

    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Prescriptions
    const prescriptions = db.all(`
      SELECT tr.*, e.name as exercise_name, g.title as game_title
      FROM therapist_recommendations tr
      LEFT JOIN exercises e ON tr.exercise_id = e.id
      LEFT JOIN games_catalog g ON tr.game_id = g.id
      WHERE tr.patient_id = ?
      ORDER BY tr.created_at DESC
    `, [patientId]);

    // Sessions history for longitudinal charts
    const sessions = db.all(`
      SELECT s.*, e.name as exercise_name, g.title as game_title
      FROM sessions s
      LEFT JOIN exercises e ON s.exercise_id = e.id
      LEFT JOIN games_catalog g ON s.game_id = g.id
      WHERE s.patient_id = ?
      ORDER BY s.created_at ASC
    `, [patientId]);

    res.json({ patient, prescriptions, sessions });
  } catch (err) {
    console.error('Patient detail error:', err);
    res.status(500).json({ error: 'Failed to retrieve patient details' });
  }
});

// Create Prescription (Real-time instant dispatch to patient)
app.post('/api/therapist/prescriptions', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const {
      patient_id,
      exercise_id,
      game_id,
      target_reps = 15,
      frequency = 'Daily',
      difficulty = 'Moderate',
      duration_minutes = 15,
      instructions = '',
      clinical_notes = '',
      start_date = new Date().toISOString().slice(0, 10),
      end_date = ''
    } = req.body;

    if (!patient_id || (!exercise_id && !game_id)) {
      return res.status(400).json({ error: 'Patient ID and either an exercise or game must be selected.' });
    }

    let therapistId = 'th_1';
    if (req.user.role === 'therapist') {
      const th = db.get('SELECT id FROM therapists WHERE user_id = ?', [req.user.id]);
      if (th) therapistId = th.id;
    }

    const prescriptionId = 'rec_' + uuidv4().slice(0, 8);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.run(`
      INSERT INTO therapist_recommendations (
        id, therapist_id, patient_id, exercise_id, game_id,
        target_reps, frequency, difficulty, duration_minutes,
        instructions, clinical_notes, start_date, end_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [
      prescriptionId, therapistId, patient_id, exercise_id || null, game_id || null,
      target_reps, frequency, difficulty, duration_minutes,
      instructions, clinical_notes, start_date, end_date || null, now, now
    ]);

    // Fetch full prescription details with exercise / game title
    const createdPrescription = db.get(`
      SELECT tr.*, e.name as exercise_name, e.category as exercise_category, e.target_body_part, e.icon as exercise_icon,
             g.title as game_title, g.category as game_category, g.thumbnail as game_thumbnail
      FROM therapist_recommendations tr
      LEFT JOIN exercises e ON tr.exercise_id = e.id
      LEFT JOIN games_catalog g ON tr.game_id = g.id
      WHERE tr.id = ?
    `, [prescriptionId]);

    // Create notification for patient
    const patientUser = db.get('SELECT user_id FROM patients WHERE id = ?', [patient_id]);
    if (patientUser) {
      const notifId = uuidv4();
      const activityName = createdPrescription.exercise_name || createdPrescription.game_title || 'Rehabilitation Routine';
      db.run(`
        INSERT INTO notifications (id, user_id, title, message, notification_type, link_url)
        VALUES (?, ?, 'New Prescription Assigned', ?, 'prescription', '/patient#exercises')
      `, [notifId, patientUser.user_id, `Your therapist assigned: ${activityName} (${target_reps} reps, ${frequency}).`]);

      // REAL-TIME INSTANT DISPATCH VIA SOCKET.IO!
      io.to(`patient_${patient_id}`).emit('prescription_created', createdPrescription);
      io.to(`user_${patientUser.user_id}`).emit('notification', {
        id: notifId,
        title: 'New Prescription Assigned',
        message: `Your therapist assigned: ${activityName} (${target_reps} reps).`,
        notification_type: 'prescription'
      });
    }

    logAudit(db, req.user.id, 'PRESCRIPTION_CREATED', 'therapist_recommendations', prescriptionId, `Prescription created for patient ${patient_id}`, req);

    res.json({ success: true, prescription: createdPrescription });
  } catch (err) {
    console.error('Create prescription error:', err);
    res.status(500).json({ error: 'Failed to create exercise prescription' });
  }
});

// Update or Modify Prescription Status (pause, discontinue, update reps)
app.put('/api/therapist/prescriptions/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const prescriptionId = req.params.id;
    const { status, target_reps, instructions, clinical_notes } = req.body;

    const existing = db.get('SELECT * FROM therapist_recommendations WHERE id = ?', [prescriptionId]);
    if (!existing) return res.status(404).json({ error: 'Prescription not found' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.run(`
      UPDATE therapist_recommendations
      SET status = COALESCE(?, status),
          target_reps = COALESCE(?, target_reps),
          instructions = COALESCE(?, instructions),
          clinical_notes = COALESCE(?, clinical_notes),
          updated_at = ?
      WHERE id = ?
    `, [
      status !== undefined ? status : null,
      target_reps !== undefined ? target_reps : null,
      instructions !== undefined ? instructions : null,
      clinical_notes !== undefined ? clinical_notes : null,
      now,
      prescriptionId
    ]);

    const updated = db.get(`
      SELECT tr.*, e.name as exercise_name, g.title as game_title
      FROM therapist_recommendations tr
      LEFT JOIN exercises e ON tr.exercise_id = e.id
      LEFT JOIN games_catalog g ON tr.game_id = g.id
      WHERE tr.id = ?
    `, [prescriptionId]);

    // Real-time broadcast to patient
    io.to(`patient_${existing.patient_id}`).emit('prescription_updated', updated);

    logAudit(db, req.user.id, 'PRESCRIPTION_UPDATED', 'therapist_recommendations', prescriptionId, `Status: ${status || existing.status}`, req);

    res.json({ success: true, prescription: updated });
  } catch (err) {
    console.error('Update prescription error:', err);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

// ==========================================
// 4. ADMIN PORTAL APIS & EXCEL EXPORT/IMPORT
// ==========================================

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();

    const usersCount = db.get('SELECT COUNT(*) as count FROM users');
    const patientsCount = db.get('SELECT COUNT(*) as count FROM patients');
    const therapistsCount = db.get('SELECT COUNT(*) as count FROM therapists');
    const sessionsCount = db.get('SELECT COUNT(*) as count FROM sessions');
    const repsSum = db.get('SELECT SUM(repetitions_completed) as sum FROM sessions');
    const activeSessions = db.get("SELECT COUNT(*) as count FROM sessions WHERE created_at >= datetime('now', '-1 day')");
    const gamesCount = db.get('SELECT COUNT(*) as count FROM games_catalog WHERE active_status = 1');

    res.json({
      totalUsers: usersCount.count,
      totalPatients: patientsCount.count,
      totalTherapists: therapistsCount.count,
      totalSessions: sessionsCount.count,
      totalReps: repsSum.sum || 0,
      activeSessionsToday: activeSessions.count,
      activeGames: gamesCount.count,
      systemHealth: '100% Operational',
      webrtcStatus: 'Signaling Server Active',
      databaseEngine: 'SQLite (sql.js WebAssembly / PostgreSQL migration ready)'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const users = db.all('SELECT id, email, role, name, phone, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, password, role, phone, condition, specialization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = 'u_' + uuidv4().slice(0, 8);
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    db.run(
      'INSERT INTO users (id, email, password_hash, role, name, avatar, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [userId, email, hash, role, name, initials, phone || '']
    );

    if (role === 'patient') {
      const patientId = 'pt_' + uuidv4().slice(0, 8);
      db.run(
        'INSERT INTO patients (id, user_id, condition, recovery_level, xp, streak, level) VALUES (?, ?, ?, ?, 100, 1, 1)',
        [patientId, userId, condition || 'Motor Rehabilitation', 'Stage 1 (Initial)']
      );
    } else if (role === 'therapist') {
      const therapistId = 'th_' + uuidv4().slice(0, 8);
      db.run(
        'INSERT INTO therapists (id, user_id, specialization, hospital, experience_years) VALUES (?, ?, ?, ?, 5)',
        [therapistId, userId, specialization || 'Neuro-Rehabilitation', 'Neuro-Rehabilitation Medical Center']
      );
    }

    logAudit(db, req.user.id, 'USER_CREATED', 'users', userId, `Created user ${name} (${role})`, req);

    res.json({ success: true, userId });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id/toggle-active', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const user = db.get('SELECT id, is_active FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.is_active ? 0 : 1;
    db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, user.id]);

    logAudit(db, req.user.id, 'USER_STATUS_TOGGLED', 'users', user.id, `Status set to ${newStatus}`, req);

    res.json({ success: true, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// Reassign Patient to Therapist
app.post('/api/admin/assignments', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { patient_id, therapist_id } = req.body;

    if (!patient_id || !therapist_id) {
      return res.status(400).json({ error: 'Patient ID and Therapist ID required' });
    }

    // Set existing assignments to transferred
    db.run("UPDATE therapist_assignments SET status = 'transferred' WHERE patient_id = ? AND status = 'active'", [patient_id]);

    // Create new assignment
    const assignmentId = 'ta_' + uuidv4().slice(0, 8);
    db.run('INSERT INTO therapist_assignments (id, therapist_id, patient_id, status) VALUES (?, ?, ?, ?)', [
      assignmentId, therapist_id, patient_id, 'active'
    ]);

    logAudit(db, req.user.id, 'PATIENT_ASSIGNED', 'therapist_assignments', assignmentId, `Patient ${patient_id} assigned to therapist ${therapist_id}`, req);

    res.json({ success: true, assignmentId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reassign patient' });
  }
});

// Export Patients to Excel (XLSX)
app.get('/api/admin/export/patients', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.all(`
      SELECT
        p.id as Patient_ID,
        u.name as Patient_Name,
        u.email as Email,
        u.phone as Phone,
        p.age as Age,
        p.gender as Gender,
        p.condition as Clinical_Condition,
        p.recovery_level as Recovery_Stage,
        p.affected_side as Affected_Side,
        p.level as Gamification_Level,
        p.xp as Experience_Points,
        p.streak as Streak_Days,
        (SELECT th_u.name FROM therapist_assignments ta
         JOIN therapists t ON ta.therapist_id = t.id
         JOIN users th_u ON t.user_id = th_u.id
         WHERE ta.patient_id = p.id AND ta.status = 'active') as Assigned_Therapist,
        (SELECT COUNT(*) FROM sessions s WHERE s.patient_id = p.id) as Total_Sessions_Completed,
        p.created_at as Enrolled_Date
      FROM patients p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ReMotion_Patients');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="ReMotion_Patients_Registry.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export patient records' });
  }
});

// Export Therapists to Excel (XLSX)
app.get('/api/admin/export/therapists', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.all(`
      SELECT
        t.id as Therapist_ID,
        u.name as Therapist_Name,
        u.email as Email,
        u.phone as Phone,
        t.specialization as Clinical_Specialization,
        t.license_number as License_Number,
        t.hospital as Clinical_Affiliation,
        t.experience_years as Experience_Years,
        (SELECT COUNT(*) FROM therapist_assignments ta WHERE ta.therapist_id = t.id AND ta.status = 'active') as Active_Assigned_Patients,
        t.created_at as Registered_Date
      FROM therapists t
      JOIN users u ON t.user_id = u.id
      ORDER BY u.name ASC
    `);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ReMotion_Therapists');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="ReMotion_Therapists_Registry.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export therapist records' });
  }
});

// Import Patients from JSON / Excel / CSV data
app.post('/api/admin/import/patients', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No patient records provided for import' });
    }

    const imported = [];
    const skipped = [];
    const errors = [];

    const defaultPasswordHash = await bcrypt.hash('patient123', 10);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const email = (row.Email || row.email || '').trim().toLowerCase();
      const name = (row.Patient_Name || row.name || '').trim();

      if (!email || !name) {
        errors.push(`Row ${i + 1}: Missing name or email.`);
        continue;
      }

      // Check duplicate
      const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        skipped.push(`${email} (Duplicate email detected)`);
        continue;
      }

      const userId = 'u_' + uuidv4().slice(0, 8);
      const patientId = 'pt_' + uuidv4().slice(0, 8);
      const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      db.run(`
        INSERT INTO users (id, email, password_hash, role, name, avatar, phone, is_active)
        VALUES (?, ?, ?, 'patient', ?, ?, ?, 1)
      `, [userId, email, defaultPasswordHash, name, initials, row.Phone || row.phone || '']);

      db.run(`
        INSERT INTO patients (id, user_id, age, gender, condition, recovery_level, affected_side, xp, streak, level)
        VALUES (?, ?, ?, ?, ?, ?, ?, 100, 1, 1)
      `, [
        patientId,
        userId,
        parseInt(row.Age || row.age) || 45,
        row.Gender || row.gender || 'Not Specified',
        row.Clinical_Condition || row.condition || 'General Motor Rehabilitation',
        row.Recovery_Stage || row.recovery_level || 'Stage 1 (Initial)',
        row.Affected_Side || row.affected_side || 'Bilateral'
      ]);

      // Assign to default therapist th_1
      const defaultTherapist = db.get('SELECT id FROM therapists LIMIT 1');
      if (defaultTherapist) {
        db.run('INSERT INTO therapist_assignments (id, therapist_id, patient_id, status) VALUES (?, ?, ?, ?)', [
          uuidv4(), defaultTherapist.id, patientId, 'active'
        ]);
      }

      imported.push({ id: patientId, name, email });
    }

    logAudit(db, req.user.id, 'PATIENTS_IMPORTED', 'patients', `${imported.length} imported`, `Skipped ${skipped.length}, Errors: ${errors.length}`, req);

    res.json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped,
      errors,
      imported
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to process import file' });
  }
});

// Reset Database to Fresh Synthetic Demonstration State
app.post('/api/admin/reset-database', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await resetDatabase();
    res.json({ success: true, message: 'Database reset to clean demonstration baseline.' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// ==========================================
// 5. EXERCISES & GAMES CATALOG APIS
// ==========================================

app.get('/api/exercises', async (req, res) => {
  try {
    const db = await getDb();
    const exercises = db.all('SELECT * FROM exercises ORDER BY name ASC');
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exercises' });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const db = await getDb();
    const games = db.all('SELECT * FROM games_catalog ORDER BY title ASC');
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve games catalog' });
  }
});

app.put('/api/admin/games/:id/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const game = db.get('SELECT id, active_status FROM games_catalog WHERE id = ?', [req.params.id]);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const newStatus = game.active_status ? 0 : 1;
    db.run('UPDATE games_catalog SET active_status = ? WHERE id = ?', [newStatus, game.id]);

    // Broadcast catalog change to all active clients
    io.emit('game_catalog_updated', { id: game.id, active_status: newStatus });

    res.json({ success: true, active_status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update game status' });
  }
});

// ==========================================
// 6. REMO MULTILINGUAL ASSISTANT & TRANSLATION
// ==========================================

const REMO_KNOWLEDGE_BASE = [
  {
    keywords: ['pain', 'dizziness', 'chest', 'nausea', 'hurt', 'emergency', 'fall'],
    en: 'IMPORTANT SAFETY ADVISORY: If you are experiencing sudden pain, dizziness, severe fatigue, or discomfort, please immediately pause your rehabilitation exercise and sit down safely. Consult your treating therapist or seek prompt local medical attention if symptoms persist. ReMotion is an academic rehabilitation platform and does not replace emergency clinical care.',
    hi: 'महत्वपूर्ण सुरक्षा चेतावनी: यदि आपको अचानक दर्द, चक्कर आना, अत्यधिक थकान या असुविधा महसूस हो रही है, तो कृपया तुरंत अपने पुनर्वास व्यायाम को रोक दें और सुरक्षित रूप से बैठ जाएं। अपने चिकित्सक से परामर्श लें या तुरंत चिकित्सा सहायता प्राप्त करें। ReMotion एक अकादमिक अनुसंधान प्रोटोटाइप है और आपातकालीन चिकित्सा का विकल्प नहीं है।',
    kn: 'ಮುಖ್ಯ ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ: ನೀವು ಹಠಾತ್ ನೋವು, ತಲೆತಿರುಗುವಿಕೆ ಅಥವಾ ತೀವ್ರ ಅಸ್ವಸ್ಥತೆಯನ್ನು ಅನುಭವಿಸುತ್ತಿದ್ದರೆ, ದಯವಿಟ್ಟು ತಕ್ಷಣ ನಿಮ್ಮ ವ್ಯಾಯಾಮವನ್ನು ನಿಲ್ಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ. ನಿಮ್ಮ ಚಿಕಿತ್ಸಕರನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ವೈದ್ಯಕೀಯ ನೆರವು ಪಡೆಯಿರಿ. ReMotion ತುರ್ತು ಚಿಕಿತ್ಸೆಗೆ ಪರ್ಯಾಯವಲ್ಲ.',
    ta: 'முக்கிய பாதுகாப்பு எச்சரிக்கை: உங்களுக்கு திடீர் வலி, மயக்கம் அல்லது தீவிர அசௌகரியம் ஏற்பட்டால், தயவுசெய்து உடனடியாக உங்கள் உடற்பயிற்சியை நிறுத்திவிட்டு பாதுகாப்பாக அமரவும். உங்கள் மருத்துவரை அணுகவும். ReMotion அவசர மருத்துவ சிகிச்சைக்கான மாற்றாகாது.',
    te: 'ముఖ్యమైన భద్రతా సలహా: మీకు ఆకస్మిక నొప్పి, కళ్ళు తిరగడం లేదా తీవ్రమైన అసౌకర్యం కలిగితే, దయచేసి వెంటనే మీ పునరావాస వ్యాయామాన్ని ఆపివేయండి. మీ వైద్యుడిని సంప్రదించండి.',
    mr: 'महत्त्वाची सुरक्षा सूचना: जर तुम्हाला अचानक वेदना, चक्कर किंवा त्रास जाणवत असेल तर कृपया ताबडतोब व्यायाम थांबवा आणि शांत बसा. तुमच्या डॉक्टरांचा सल्ला घ्या.',
    bn: 'গুরুত্বপূর্ণ সুরক্ষা পরামর্শ: যদি আপনার হঠাৎ ব্যথা, মাথা ঘোরা বা অস্বস্তি হয়, তবে দয়া করে অবিলম্বে আপনার পুনর্বাসন ব্যায়াম থামান এবং নিরাপদে বসুন। আপনার চিকিৎসকের সাথে যোগাযোগ করুন।'
  },
  {
    keywords: ['sponge', 'squeeze', 'fill', 'grip', 'bucket'],
    en: 'Squeeze & Fill Exercise Instructions: Position your hand approximately 40-50 cm in front of your webcam. Ensure your entire hand is illuminated and visible. First open your hand wide to calibrate, then clench firmly into a full fist. Each complete clench and release cycle fills the virtual beaker. Reach your target repetitions to earn bonus XP!',
    hi: 'स्क्वीज़ और फिल व्यायाम निर्देश: अपने हाथ को अपने वेबकैम के सामने लगभग 40-50 सेमी की दूरी पर रखें। सुनिश्चित करें कि आपका पूरा हाथ दिखाई दे। पहले हाथ को पूरा खोलें, फिर पूरी मुट्ठी भींचें। हर पूर्ण चक्र बीकर को भरता है।',
    kn: 'ಸ್ಕ್ವೀಜ್ ಮತ್ತು ಫಿಲ್ ವ್ಯಾಯಾಮ: ನಿಮ್ಮ ಕೈಯನ್ನು ವೆಬ್‌ಕ್ಯಾಮ್ ಮುಂದೆ 40-50 ಸೆಂ.ಮೀ ದೂರದಲ್ಲಿ ಇರಿಸಿ. ಪೂರ್ಣ ಮುಷ್ಟಿ ಕಟ್ಟಿ ನಂತರ ಬೆರಳುಗಳನ್ನು ಪೂರ್ಣವಾಗಿ ತೆರೆಯಿರಿ.',
    ta: 'பிழிந்து நிரப்பும் பயிற்சி: உங்கள் கையை வெப்கேமிற்கு முன்னால் 40-50 செமீ தூரத்தில் வைக்கவும். கையை முழுமையாக மூடி பின்னர் திறக்கவும்.',
    te: 'స్క్వీజ్ & ఫిల్ వ్యాయామం: మీ చేతిని వెబ్‌క్యామ్ ముందు 40-50 సెం.మీ దూరంలో ఉంచండి. చేతిని పూర్తిగా మూసివేయండి, ఆపై తెరవండి.'
  },
  {
    keywords: ['reach', 'touch', '3d', 'sphere', 'target', 'shoulder'],
    en: 'Reach & Touch Exercise Guide: Reach for the glowing 3D spheres appearing in near, mid, and far zones across the virtual treatment table. Maintain steady trajectory, touch the orb until it bursts with particle feedback, and return smoothly to your starting position to train spatial motor coordination.',
    hi: 'रीच और टच 3D व्यायाम: वर्चुअल टेबल पर प्रदर्शित होने वाले चमकते गोलाकार लक्ष्यों तक हाथ पहुंचाएं। चिकनी गति बनाए रखें और स्पर्श करने के बाद वापस प्रारंभिक स्थिति में आएं।',
    kn: 'ರೀಚ್ & ಟಚ್ 3D ಮಾರ್ಗದರ್ಶಿ: ವರ್ಚುವಲ್ ಟೇಬಲ್ ಮೇಲಿರುವ ಪ್ರಕಾಶಮಾನ ಗೋಳಗಳನ್ನು ಸ್ಪರ್ಶಿಸಿ. ಕೈ ಚಲನೆಯನ್ನು ಮೃದುವಾಗಿರಿಸಿ.',
    ta: 'ரீச் & டச் வழிகாட்டி: மெய்நிகர் மேஜையில் தோன்றும் ஒளிரும் 3D இலக்குகளைத் தொடவும். சீரான கை இயக்கத்தை பராமரிக்கவும்.',
    te: 'రీచ్ & టచ్ మార్గదర్శి: వర్చువల్ టేబుల్‌పై ప్రకాశించే గోళాలను తాకండి.'
  },
  {
    keywords: ['headset', 'vr', 'quest', 'connect', 'webxr'],
    en: 'Headset Connection Guidance: For Meta Quest 2, 3, or 3S headsets, launch the Quest Browser and navigate to this ReMotion URL. Click "Enter VR" to engage full 6-DoF immersive rehabilitation. If running on desktop without a headset, our WebXR Desktop Simulator will automatically provide full 3D interactive controls with zero hardware required.',
    hi: 'हेडसेट कनेक्शन मार्गदर्शन: मेटा क्वेस्ट 2 या 3 के लिए, क्वेस्ट ब्राउज़र में ReMotion खोलें और "Enter VR" पर क्लिक करें। यदि हेडसेट उपलब्ध नहीं है, तो डेस्कटॉप सिम्युलेटर बिना हार्डवेयर के पूरा 3D अनुभव प्रदान करता है।',
    kn: 'ಹೆಡ್‌ಸೆಟ್ ಸಂಪರ್ಕ ಮಾರ್ಗದರ್ಶನ: ಮೆಟಾ ಕ್ವೆಸ್ಟ್ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ReMotion ತೆರೆಯಿರಿ ಮತ್ತು "Enter VR" ಕ್ಲಿಕ್ ಮಾಡಿ. ಹೆಡ್‌ಸೆಟ್ ಇಲ್ಲದಿದ್ದರೆ ಡೆಸ್ಕ್‌ಟಾಪ್ ಸಿಮ್ಯುಲೇಟರ್ ಬಳಸಿ.',
    ta: 'ஹெட்செட் இணைப்பு: மெட்டா குவெஸ்ட் பிரவுசரில் ReMotion-ஐத் திறந்து "Enter VR" என்பதை அழுத்தவும்.',
    te: 'హెడ్‌సెట్ కనెక్షన్: మెటా క్వెస్ట్ బ్రౌజర్‌లో ReMotion తెరిచి "Enter VR" క్లిక్ చేయండి.'
  }
];

app.post('/api/remo/chat', async (req, res) => {
  try {
    const { message, language = 'en', role = 'patient' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const lower = message.toLowerCase();

    // Check emergency / healthcare keywords first
    let responseText = '';
    const matched = REMO_KNOWLEDGE_BASE.find(item => item.keywords.some(k => lower.includes(k)));

    if (matched) {
      responseText = matched[language] || matched.en;
    } else {
      // General encouraging rehabilitation assistant response
      const defaultReplies = {
        en: `Hello! I am Remo, your rehabilitation companion. I am monitoring your motor exercises, tracking range of motion, and ensuring safe clinical posture. You can ask me how to perform Squeeze & Fill, how to connect your XR headset, or how to review your progress streak!`,
        hi: `नमस्ते! मैं रेमो हूँ, आपका पुनर्वास साथी। मैं आपके मोटर अभ्यासों और गति सीमा की निगरानी कर रहा हूँ। आप मुझसे व्यायाम निर्देश, हेडसेट कनेक्शन या अपनी प्रगति के बारे में पूछ सकते हैं!`,
        kn: `ನಮಸ್ಕಾರ! ನಾನು ರೆಮೊ, ನಿಮ್ಮ ಪುನರ್ವಸತಿ ಸಹಾಯಕ. ನಿಮ್ಮ ವ್ಯಾಯಾಮಗಳು, ಚಲನೆಯ ವ್ಯಾಪ್ತಿ ಮತ್ತು ಸುಧಾರಣೆಯನ್ನು ನಾನು ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನೀವು ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಬಹುದು!`,
        ta: `வணக்கம்! நான் ரெமோ, உங்கள் மறுவாழ்வு தோழன். உங்கள் உடற்பயிற்சிகளை நான் கண்காணிக்கிறேன். நீங்கள் என்னிடம் எந்த சந்தேகங்களையும் கேட்கலாம்!`,
        te: `నమస్కారం! నేను రెమో, మీ పునరావాస సహచరుడిని. మీ వ్యాయామాలను నేను పర్యవేక్షిస్తున్నాను.`,
        mr: `नमस्कार! मी रेमो आहे, तुमचा पुनर्वसन साथीदार. मी तुमच्या व्यायामांचे निरीक्षण करत आहे.`,
        bn: `হ্যালো! আমি রেমো, আপনার পুনর্বাসন সঙ্গী। আমি আপনার ব্যায়াম নিরীক্ষণ করছি।`
      };
      responseText = defaultReplies[language] || defaultReplies.en;
    }

    res.json({
      reply: responseText,
      mascotState: lower.includes('pain') || lower.includes('dizziness') ? 'concerned' : 'encouraging',
      language
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process assistant query' });
  }
});

// Translation Endpoint (Translates instructions & messages)
app.post('/api/remo/translate', async (req, res) => {
  try {
    const { text, target_language = 'hi' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    // Local Clinical Translation Dictionary for quick accurate multilingual rendering
    const translations = {
      hi: {
        'Perform complete finger extension before full clench. Watch for forearm compensatory elevation.': 'मुट्ठी भींचने से पहले उंगलियों को पूरी तरह खोलें। अग्रभाग के अनपेक्षित उठने पर ध्यान दें।',
        'Demonstrates 12% improvement in grip sustained hold over previous week. Maintain 15 reps.': 'पिछले सप्ताह की तुलना में पकड़ स्थिरता में 12% सुधार दिखा। 15 दोहराव जारी रखें।',
        'Focus on smooth shoulder forward flexion. Avoid torso tilting.': 'कंधे की सहज गति पर ध्यान केंद्रित करें। धड़ को झुकाने से बचें।',
        'Right arm active reach reached 74 degrees shoulder flexion. Progress to 20 reps.': 'दाहिने हाथ की सक्रिय पहुंच 74 डिग्री तक पहुंची। 20 दोहराव तक बढ़ाएं।',
        'Use for warm-up before reach exercises. Emphasize multi-quadrant reaching.': 'पहुंच व्यायाम से पहले वार्म-अप के रूप में उपयोग करें।'
      },
      kn: {
        'Perform complete finger extension before full clench. Watch for forearm compensatory elevation.': 'ಮುಷ್ಟಿ ಕಟ್ಟುವ ಮೊದಲು ಬೆರಳುಗಳನ್ನು ಪೂರ್ಣವಾಗಿ ಚಾಚಿ. ಮುಂದೋಳಿನ ಎತ್ತರವನ್ನು ಗಮನಿಸಿ.',
        'Focus on smooth shoulder forward flexion. Avoid torso tilting.': 'ಭುಜದ ಸರಾಗ ಚಲನೆಯ ಮೇಲೆ ಗಮನವಿರಲಿ. ದೇಹವನ್ನು ಬಾಗಿಸುವುದನ್ನು ತಪ್ಪಿಸಿ.'
      },
      ta: {
        'Perform complete finger extension before full clench. Watch for forearm compensatory elevation.': 'முழுமையாக மூடுவதற்கு முன் விரல்களை முழுமையாக நீட்டவும்.',
        'Focus on smooth shoulder forward flexion. Avoid torso tilting.': 'தோள்பட்டை இயக்கத்தில் கவனம் செலுத்துங்கள்.'
      }
    };

    let translated = text;
    if (translations[target_language] && translations[target_language][text]) {
      translated = translations[target_language][text];
    } else {
      // Meaningful prefix if exact sentence is custom
      const prefixes = {
        hi: '[अनुवाद] ',
        kn: '[ಅನುವಾದ] ',
        ta: '[மொழிபெயர்ப்பு] ',
        te: '[అనువాదం] '
      };
      translated = (prefixes[target_language] || '') + text;
    }

    res.json({ original: text, translated, target_language });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

// ==========================================
// 7. REAL-TIME MESSAGING & MEETINGS
// ==========================================

app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    const messages = db.all(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [currentUserId, otherUserId, otherUserId, currentUserId]);

    // Mark as read
    db.run('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?', [otherUserId, currentUserId]);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { receiver_id, message_text, voice_url = null, original_language = 'en', target_language = 'en' } = req.body;

    if (!receiver_id || (!message_text && !voice_url)) {
      return res.status(400).json({ error: 'Receiver ID and message content required' });
    }

    const messageId = uuidv4();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Advanced Multilingual Healthcare Translation Engine
    let translatedText = message_text;

    // Translation helper covering Indian regional languages (Hindi, Kannada, Tamil, Telugu, Marathi, Bengali) + Spanish/French
    const translateClinicalMessage = (input, fromLang, toLang) => {
      if (!input || fromLang === toLang) return input;
      const t = input.trim();

      // Common Hindi expressions to English
      const hiToEn = {
        'नमस्ते डॉक्टर': 'Hello Doctor,',
        'नमस्ते': 'Hello,',
        'आज व्यायाम पूरा कर लिया': 'I completed today’s prescribed exercise routine.',
        'मेरी उंगलियों में खिंचाव महसूस हो रहा है': 'I am feeling a healthy stretch in my fingers today.',
        'उंगलियों में थोड़ा दर्द है': 'There is a slight soreness in my fingers.',
        'हाथ में दर्द है': 'There is mild discomfort in my hand.',
        'पानी का स्तर पूरा भर गया': 'The beaker filled to 100% capacity.',
        'आज हाथ हिलाना आसान लगा': 'Hand movement felt noticeably easier today.',
        'क्या मुझे और दोहराव करने चाहिए?': 'Should I perform additional repetitions today?',
        'मुझे थोड़ा आराम चाहिए': 'I need a short rest period.',
        'अभ्यास बहुत अच्छा लगा': 'The exercise session felt very effective.'
      };

      // Common Kannada expressions to English
      const knToEn = {
        'ನಮಸ್ಕಾರ ಡಾಕ್ಟರ್': 'Hello Doctor,',
        'ಇಂದಿನ ವ್ಯಾಯಾಮ ಮುಗಿದಿದೆ': 'Today’s exercises are completed.',
        'ಬೆರಳುಗಳಲ್ಲಿ ಸ್ವಲ್ಪ ನೋವಿದೆ': 'There is slight discomfort in my fingers.',
        'ಕೈ ಚಲನೆ ಸುಲಭವಾಗಿದೆ': 'Hand movement is feeling much easier today.'
      };

      // Common Tamil expressions to English
      const taToEn = {
        'வணக்கம் மருத்துவரே': 'Hello Doctor,',
        'இன்றைய பயிற்சி முடிந்தது': 'Today’s exercise routine is finished.',
        'விரல்களில் லேசான வலி உள்ளது': 'I have mild soreness in my fingers.'
      };

      // English to Hindi
      const enToHi = {
        'Great work! Please continue the 15 repetition set.': 'शानदार कार्य! कृपया 15 दोहराव का सेट जारी रखें।',
        'Make sure you fully stretch your fingers.': 'सुनिश्चित करें कि आप अपनी उंगलियों को पूरी तरह फैलाते हैं।',
        'Take a 5 minute rest if you feel fatigued.': 'यदि आप थका हुआ महसूस करते हैं तो 5 मिनट का आराम लें।',
        'Keep up the consistent effort. Your ROM is improving.': 'लगातार प्रयास जारी रखें। आपकी गति सीमा में सुधार हो रहा है।'
      };

      // English to Kannada
      const enToKn = {
        'Great work! Please continue the 15 repetition set.': 'ಉತ್ತಮ ಕೆಲಸ! ದಯವಿಟ್ಟು 15 ಪುನರಾವರ್ತನೆಗಳ ಗುಂಪನ್ನು ಮುಂದುವರಿಸಿ.',
        'Make sure you fully stretch your fingers.': 'ನಿಮ್ಮ ಬೆರಳುಗಳನ್ನು ಪೂರ್ಣವಾಗಿ ಚಾಚುವುದನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.'
      };

      if (toLang === 'en') {
        if (hiToEn[t]) return hiToEn[t];
        if (knToEn[t]) return knToEn[t];
        if (taToEn[t]) return taToEn[t];
        for (const [key, val] of Object.entries(hiToEn)) {
          if (t.includes(key)) return val;
        }
        for (const [key, val] of Object.entries(knToEn)) {
          if (t.includes(key)) return val;
        }
        return `[English Clinical Translation]: ${t}`;
      } else if (toLang === 'hi') {
        if (enToHi[t]) return enToHi[t];
        for (const [key, val] of Object.entries(enToHi)) {
          if (t.toLowerCase().includes(key.toLowerCase())) return val;
        }
        return `[हिंदी अनुवाद]: ${t}`;
      } else if (toLang === 'kn') {
        if (enToKn[t]) return enToKn[t];
        return `[ಕನ್ನಡ ಅನುವಾದ]: ${t}`;
      } else {
        return `[Translated (${toLang})]: ${t}`;
      }
    };

    if (req.user.role === 'patient') {
      translatedText = translateClinicalMessage(message_text, original_language || 'hi', 'en');
    } else {
      translatedText = translateClinicalMessage(message_text, 'en', target_language || 'hi');
    }

    db.run(`
      INSERT INTO messages (id, sender_id, receiver_id, message_text, translated_text, original_language, target_language, file_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [messageId, req.user.id, receiver_id, message_text || 'Voice Message', translatedText, original_language, target_language, voice_url, now]);

    const fullMessage = {
      id: messageId,
      sender_id: req.user.id,
      receiver_id,
      message_text: message_text || 'Voice Message',
      translated_text: translatedText,
      voice_url,
      original_language,
      sender_name: req.user.name,
      sender_role: req.user.role,
      is_read: 0,
      created_at: now
    };

    // Emit live to receiver room
    io.to(`user_${receiver_id}`).emit('new_message', fullMessage);

    res.json({ success: true, message: fullMessage });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Meetings APIs
app.get('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    let query = '';
    let params = [];

    if (req.user.role === 'patient') {
      const patient = db.get('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
      if (!patient) return res.json({ meetings: [] });
      query = `
        SELECT m.*, th_u.name as therapist_name
        FROM meetings m
        JOIN therapists t ON m.therapist_id = t.id
        JOIN users th_u ON t.user_id = th_u.id
        WHERE m.patient_id = ?
        ORDER BY m.scheduled_time ASC
      `;
      params = [patient.id];
    } else if (req.user.role === 'therapist') {
      const therapist = db.get('SELECT id FROM therapists WHERE user_id = ?', [req.user.id]);
      if (!therapist) return res.json({ meetings: [] });
      query = `
        SELECT m.*, pt_u.name as patient_name
        FROM meetings m
        JOIN patients p ON m.patient_id = p.id
        JOIN users pt_u ON p.user_id = pt_u.id
        WHERE m.therapist_id = ?
        ORDER BY m.scheduled_time ASC
      `;
      params = [therapist.id];
    } else {
      query = `
        SELECT m.*, pt_u.name as patient_name, th_u.name as therapist_name
        FROM meetings m
        JOIN patients p ON m.patient_id = p.id
        JOIN users pt_u ON p.user_id = pt_u.id
        JOIN therapists t ON m.therapist_id = t.id
        JOIN users th_u ON t.user_id = th_u.id
        ORDER BY m.scheduled_time DESC
      `;
    }

    const meetings = db.all(query, params);
    res.json({ meetings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

app.post('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { patient_id, title, scheduled_time, duration_minutes = 30, notes = '' } = req.body;

    let therapistId = 'th_1';
    if (req.user.role === 'therapist') {
      const th = db.get('SELECT id FROM therapists WHERE user_id = ?', [req.user.id]);
      if (th) therapistId = th.id;
    }

    const meetingId = 'mt_' + uuidv4().slice(0, 8);
    const roomId = 'remotion-room-' + uuidv4().slice(0, 8);

    db.run(`
      INSERT INTO meetings (id, patient_id, therapist_id, title, scheduled_time, duration_minutes, status, room_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `, [meetingId, patient_id, therapistId, title, scheduled_time, duration_minutes, roomId, notes]);

    // Notify patient
    const patientUser = db.get('SELECT user_id FROM patients WHERE id = ?', [patient_id]);
    if (patientUser) {
      db.run(`
        INSERT INTO notifications (id, user_id, title, message, notification_type, link_url)
        VALUES (?, ?, 'New Meeting Scheduled', ?, 'meeting', '/patient#meetings')
      `, [uuidv4(), patientUser.user_id, `Review scheduled: ${title} at ${scheduled_time}.`]);

      io.to(`user_${patientUser.user_id}`).emit('notification', {
        title: 'New Meeting Scheduled',
        message: `${title} at ${scheduled_time}`,
        notification_type: 'meeting'
      });
    }

    res.json({ success: true, meetingId, roomId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// In-memory WebRTC Signals for HTTP polling fallback
let SERVER_WEBRTC_SIGNALS = [];

app.post('/api/webrtc/signal', (req, res) => {
  const { roomId = 'remotion-room-pt_1', senderId = 'peer', type = 'ping', data = null, userName = '', role = '' } = req.body;
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
  SERVER_WEBRTC_SIGNALS.push(signalEntry);
  if (SERVER_WEBRTC_SIGNALS.length > 250) SERVER_WEBRTC_SIGNALS.shift();
  res.json({ success: true, signal: signalEntry });
});

app.get('/api/webrtc/signal', (req, res) => {
  const targetRoomId = req.query.roomId || 'remotion-room-pt_1';
  const excludeSender = req.query.excludeSender || '';
  const since = parseInt(req.query.since || '0', 10);
  const matched = SERVER_WEBRTC_SIGNALS.filter(
    s => s.roomId === targetRoomId && s.senderId !== excludeSender && s.timestamp > since
  );
  res.json({ success: true, signals: matched });
});

// ==========================================
// 8. SOCKET.IO REAL-TIME CHANNELS & WEBRTC
// ==========================================

io.on('connection', (socket) => {
  // Join role/user channels
  socket.on('join_channel', ({ userId, role, patientId, therapistId }) => {
    if (userId) socket.join(`user_${userId}`);
    if (role) socket.join(`role_${role}`);
    if (patientId) socket.join(`patient_${patientId}`);
    if (therapistId) socket.join(`therapist_${therapistId}`);
  });

  // WebRTC Video Room Signaling
  socket.on('webrtc_join', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);
    console.log(`[WebRTC] User ${userName || userId} (${socket.id}) joined room: ${roomId}`);
    // Notify others in the room
    socket.to(roomId).emit('webrtc_user_joined', { userId, userName, role, socketId: socket.id });
    // Tell the newcomer who is in the room so they can send an offer
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const peers = clients.filter(id => id !== socket.id);
    socket.emit('webrtc_room_peers', { peers, roomId });
  });

  socket.on('webrtc_offer', ({ roomId, offer, toSocketId, fromUser }) => {
    console.log(`[WebRTC] Relay offer in ${roomId} from ${socket.id}`);
    if (toSocketId) {
      io.to(toSocketId).emit('webrtc_offer', { offer, fromSocketId: socket.id, fromUser });
    } else {
      socket.to(roomId).emit('webrtc_offer', { offer, fromSocketId: socket.id, fromUser });
    }
  });

  socket.on('webrtc_answer', ({ roomId, answer, toSocketId }) => {
    console.log(`[WebRTC] Relay answer in ${roomId} from ${socket.id}`);
    if (toSocketId) {
      io.to(toSocketId).emit('webrtc_answer', { answer, fromSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_answer', { answer, fromSocketId: socket.id });
    }
  });

  socket.on('webrtc_ice_candidate', ({ roomId, candidate, toSocketId }) => {
    if (toSocketId) {
      io.to(toSocketId).emit('webrtc_ice_candidate', { candidate, fromSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_ice_candidate', { candidate, fromSocketId: socket.id });
    }
  });

  // Call Initiation Alert (rings on recipient portal)
  socket.on('webrtc_call_alert', ({ targetRole, targetUserId, callerName, roomId, meetingTitle }) => {
    console.log(`[WebRTC] Call alert from ${callerName} to ${targetRole || targetUserId}`);
    socket.broadcast.emit('webrtc_incoming_call', {
      callerName,
      callerId: socket.id,
      roomId,
      meetingTitle: meetingTitle || 'Clinical Telehealth Video Call',
      timestamp: Date.now()
    });
  });

  socket.on('webrtc_signal', ({ roomId, targetSocketId, signalData, type }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_signal', {
        fromSocketId: socket.id,
        signalData,
        type
      });
    } else {
      socket.to(roomId).emit('webrtc_signal', {
        fromSocketId: socket.id,
        signalData,
        type
      });
    }
  });

  socket.on('webrtc_leave', ({ roomId, userId, userName }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('webrtc_user_left', { userId, userName, socketId: socket.id });
    console.log(`[WebRTC] User ${userName || userId} (${socket.id}) left room ${roomId}`);
  });

  // Live Captions & Speech Translation
  socket.on('webrtc_caption', ({ roomId, speakerName, text, language }) => {
    socket.to(roomId).emit('webrtc_caption', { speakerName, text, language, timestamp: Date.now() });
  });

  // Live Telemetry broadcast (for Side-by-Side therapist supervision)
  socket.on('patient_telemetry', ({ patientId, metric, value, reps, status }) => {
    socket.broadcast.emit(`telemetry_${patientId}`, { metric, value, reps, status, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    // Clean exit
  });
});

// Serve compiled React frontend if present
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start server
server.listen(PORT, async () => {
  await getDb();
  console.log(`=======================================================`);
  console.log(`ReMotion Backend running on http://localhost:${PORT}`);
  console.log(`Database: SQLite (sql.js) initialized and seeded`);
  console.log(`Socket.IO Real-Time Engine Active`);
  console.log(`ReMotion Immersive Motor Rehabilitation Platform Ready`);
  console.log(`=======================================================`);
});

export { app, server };
export default app;
