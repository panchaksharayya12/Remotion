import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'remotion.sqlite');

let dbInstance = null;

// Helper to convert sql.js result to array of objects
function resultToObjects(res) {
  if (!res || !res.length) return [];
  const { columns, values } = res[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function resetDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try { fs.unlinkSync(DB_FILE); } catch (e) {}
  }
  dbInstance = null;
  return getDb();
}

export async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(DB_FILE)) {
    try {
      const buffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
    } catch (err) {
      console.warn('Failed to load existing SQLite file, creating fresh:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Wrapper with better-sqlite3 style methods
  const wrapper = {
    _db: db,
    save() {
      try {
        const data = db.export();
        fs.writeFileSync(DB_FILE, Buffer.from(data));
      } catch (err) {
        console.error('Error saving SQLite database:', err);
      }
    },
    all(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    get(sql, params = []) {
      const rows = this.all(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    run(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.run(params);
      stmt.free();
      this.save();
      return { changes: db.getRowsModified() };
    },
    exec(sql) {
      db.exec(sql);
      this.save();
    }
  };

  dbInstance = wrapper;
  initSchema(wrapper);
  await seedInitialData(wrapper);
  return wrapper;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'therapist', 'admin', 'guest')),
      name TEXT NOT NULL,
      avatar TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      age INTEGER,
      gender TEXT,
      condition TEXT,
      recovery_level TEXT,
      affected_side TEXT,
      xp INTEGER DEFAULT 100,
      streak INTEGER DEFAULT 1,
      level INTEGER DEFAULT 1,
      emergency_contact TEXT,
      primary_language TEXT DEFAULT 'en',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS therapists (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      specialization TEXT,
      license_number TEXT,
      hospital TEXT,
      bio TEXT,
      experience_years INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS therapist_assignments (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'transferred')),
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      target_body_part TEXT,
      default_duration INTEGER,
      default_reps INTEGER,
      difficulty_levels TEXT,
      instructions_json TEXT,
      icon TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games_catalog (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      difficulty_options TEXT,
      instructions TEXT,
      active_status INTEGER DEFAULT 1,
      thumbnail TEXT,
      controls TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS therapist_recommendations (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      exercise_id TEXT,
      game_id TEXT,
      target_reps INTEGER DEFAULT 10,
      frequency TEXT DEFAULT 'Daily',
      difficulty TEXT DEFAULT 'Moderate',
      duration_minutes INTEGER DEFAULT 15,
      instructions TEXT,
      clinical_notes TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'discontinued')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      exercise_id TEXT,
      game_id TEXT,
      session_type TEXT NOT NULL CHECK(session_type IN ('exercise', 'game', 'assessment')),
      start_time TEXT,
      end_time TEXT,
      duration_seconds INTEGER DEFAULT 0,
      repetitions_completed INTEGER DEFAULT 0,
      accuracy_pct REAL DEFAULT 0,
      range_of_motion_deg REAL DEFAULT 0,
      reaction_time_ms REAL DEFAULT 0,
      grip_strength_score REAL DEFAULT 0,
      device_type TEXT DEFAULT 'desktop_sim',
      tracking_quality TEXT DEFAULT 'Optimal (98%)',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_metrics (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS high_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      achieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      therapist_id TEXT NOT NULL,
      title TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      room_id TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      message_text TEXT NOT NULL,
      translated_text TEXT,
      target_language TEXT,
      original_language TEXT DEFAULT 'en',
      file_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      notification_type TEXT DEFAULT 'system',
      is_read INTEGER DEFAULT 0,
      link_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      source_text TEXT NOT NULL,
      target_language TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_role TEXT DEFAULT 'all',
      priority TEXT DEFAULT 'normal',
      created_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS headset_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL,
      serial_number TEXT,
      battery_level INTEGER DEFAULT 95,
      tracking_status TEXT DEFAULT 'Ready',
      last_connected TEXT DEFAULT CURRENT_TIMESTAMP,
      is_connected INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

async function seedInitialData(db) {
  const existingUsers = db.all('SELECT COUNT(*) as count FROM users');
  if (existingUsers[0].count > 0) return; // Already seeded

  console.log('Seeding synthetic clinical data for ReMotion demonstration...');

  const patientHash = await bcrypt.hash('patient123', 10);
  const therapistHash = await bcrypt.hash('therapist123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);
  const guestHash = await bcrypt.hash('guest123', 10);

  // 1. Users
  const users = [
    ['u_admin', 'admin@remotion.health', adminHash, 'admin', 'System Administrator', 'SA', '+91 98450 00101', 1],
    ['u_therapist_1', 'therapist@remotion.health', therapistHash, 'therapist', 'Dr. Rajesh Kulkarni, PT', 'RK', '+91 98450 00102', 1],
    ['u_therapist_2', 'priya.nair@remotion.health', therapistHash, 'therapist', 'Dr. Priya Nair, OTR/L', 'PN', '+91 98450 00103', 1],
    ['u_patient_1', 'patient@remotion.health', patientHash, 'patient', 'Asha Sharma', 'AS', '+91 98450 00201', 1],
    ['u_patient_2', 'ravi.patel@remotion.health', patientHash, 'patient', 'Ravi Patel', 'RP', '+91 98450 00202', 1],
    ['u_patient_3', 'meena.s@remotion.health', patientHash, 'patient', 'Meena Sundaram', 'MS', '+91 98450 00203', 1],
    ['u_patient_4', 'vikram.m@remotion.health', patientHash, 'patient', 'Vikram Malhotra', 'VM', '+91 98450 00204', 1],
    ['u_guest', 'guest@remotion.health', guestHash, 'guest', 'ReMotion Tech Explorer', 'TE', '+91 98450 00301', 1]
  ];

  for (const u of users) {
    db.run(
      'INSERT INTO users (id, email, password_hash, role, name, avatar, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      u
    );
  }

  // 2. Therapists
  db.run(`INSERT INTO therapists (id, user_id, specialization, license_number, hospital, bio, experience_years) VALUES
    ('th_1', 'u_therapist_1', 'Neuro-Rehabilitation & Motor Recovery', 'MCI-PT-2015-8842', 'Centre for Neuro Sciences', 'Senior physical therapist specializing in upper-limb motor rehabilitation and virtual reality biofeedback therapies.', 14),
    ('th_2', 'u_therapist_2', 'Occupational Therapy & Fine Motor Recovery', 'AIOTA-OT-2018-4419', 'National Institute of Rehabilitation', 'Expert in dexterity, hand function recovery and stroke occupational therapy.', 9)
  `);

  // 3. Patients
  db.run(`INSERT INTO patients (id, user_id, age, gender, condition, recovery_level, affected_side, xp, streak, level, emergency_contact, primary_language) VALUES
    ('pt_1', 'u_patient_1', 58, 'Female', 'Post-Stroke Left Upper Limb Hemiparesis', 'Intermediate Recovery (Stage 4)', 'Left', 480, 7, 4, '+91 98450 99991', 'hi'),
    ('pt_2', 'u_patient_2', 34, 'Male', 'Flexor Tendon Strain & Carpal Tunnel Syndrome', 'Early Stage (Stage 2)', 'Right', 240, 3, 2, '+91 98450 99992', 'en'),
    ('pt_3', 'u_patient_3', 46, 'Female', 'Post-Colles Distal Radius Fracture Stiffness', 'Advanced Recovery (Stage 5)', 'Right', 820, 14, 6, '+91 98450 99993', 'kn'),
    ('pt_4', 'u_patient_4', 41, 'Male', 'Traumatic Brain Injury Upper-Limb Coordination', 'Moderate Recovery (Stage 3)', 'Left', 310, 5, 3, '+91 98450 99994', 'ta')
  `);

  // 4. Therapist Assignments (Dr. Rajesh has pt_1, pt_2, pt_3. Dr. Priya has pt_4)
  db.run(`INSERT INTO therapist_assignments (id, therapist_id, patient_id, status) VALUES
    ('ta_1', 'th_1', 'pt_1', 'active'),
    ('ta_2', 'th_1', 'pt_2', 'active'),
    ('ta_3', 'th_1', 'pt_3', 'active'),
    ('ta_4', 'th_2', 'pt_4', 'active')
  `);

  // 5. Exercises Catalog
  const exercises = [
    ['ex_squeeze_fill', 'Squeeze & Fill', 'Grip & Range of Motion', 'Virtual sponge compression and beaker filling with MediaPipe 21-keypoint hand tracking and clench/release cycles.', 'Hand, Wrist & Forearm', 10, 15, 'Beginner, Moderate, Advanced', '{"steps": ["Calibrate open hand", "Calibrate fist", "Clench sponge firmly", "Release fully to fill bucket"]}', 'hand'],
    ['ex_reach_touch', 'Reach & Touch', '3D Spatial Coordination', 'Interactive 3D spatial target contact testing reach trajectory, reaction latency, path efficiency, and spatial accuracy.', 'Shoulder, Arm & Elbow', 12, 20, 'Beginner, Moderate, Advanced', '{"steps": ["Orient hand to virtual table", "Reach for glowing target sphere", "Contact and hold briefly", "Return to center zone"]}', 'crosshair'],
    ['ex_hand_quiz', 'Hand Function Check', 'Dexterity & Movement Assessment', 'Systematic clinical hand motor assessment evaluating finger flexion, thumb opposition, open palm span, and gesture stability.', 'Finger Dexterity & Joints', 8, 10, 'Standard Clinical Protocol', '{"steps": ["Show open hand", "Make full fist", "Thumb-to-index pinch", "Spread all five fingers"]}', 'clipboard-check'],
    ['ex_pronation', 'Pronation & Supination Rotation', 'Forearm & Rotational Mobility', 'Forearm axial rotation tracking palm-down (pronation) to palm-up (supination) angular reach.', 'Forearm & Wrist', 10, 12, 'Beginner, Moderate', '{"steps": ["Rotate forearm palm up", "Pause at apex", "Rotate forearm palm down", "Maintain elbow at side"]}', 'rotate-cw'],
    ['ex_pinch_tracker', 'Pinch Precision Challenge', 'Fine Motor & Thumb Opposition', 'Precision key and tip pinch assessment tracking inter-phalangeal distance and pinch hold stability.', 'Thumb & Index Finger', 8, 12, 'Moderate, Advanced', '{"steps": ["Touch thumb tip to index tip", "Hold pinch for 2 seconds", "Release and open hand", "Repeat on cadence"]}', 'target']
  ];

  for (const ex of exercises) {
    db.run('INSERT INTO exercises (id, name, category, description, target_body_part, default_duration, default_reps, difficulty_levels, instructions_json, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ex);
  }

  // 6. Games Catalog (22 games required!)
  const games = [
    ['gm_cricket', 'Cricket', 'Sports Simulation', 'Rehabilitation cricket batting and hand timing exercise for coordinated upper limb extension.', 'Easy, Medium, Hard', 'Align your hand or controller with the incoming ball and execute a forward drive stroke.', 1, 'cricket', 'Hand Reach / Mouse Click'],
    ['gm_baseball', 'Baseball', 'Sports Simulation', 'Focus on swift reaction time and rotational torso-shoulder coordination hitting pitched baseballs.', 'Easy, Medium, Hard', 'Track the pitch vector and time the swing at the strike zone intersection.', 1, 'baseball', 'Hand Reach / Mouse Click'],
    ['gm_table_tennis', 'Table Tennis', 'Reflex & Precision', 'Rapid wrist-hand coordination and quick return volleying against a dynamic virtual robot.', 'Easy, Medium, Hard', 'Paddle returns with responsive wrist flick and forward contact.', 1, 'table-tennis', 'Hand Cursor / Drag'],
    ['gm_tennis', 'Tennis', 'Range of Motion', 'Full arm extension and trajectory calculation across court boundaries.', 'Easy, Medium, Hard', 'Position racket sweet-spot across incoming arc.', 1, 'tennis', 'Spatial Tracking'],
    ['gm_basketball', 'Basketball', 'Trajectory & Release', 'Arc calculation and timed wrist release to sink free throws in the hoop.', 'Easy, Medium, Hard', 'Charge shot power with elevation and release at apex.', 1, 'basketball', 'Hold & Release'],
    ['gm_bowling', 'Bowling', 'Linear Guidance', 'Smooth forward arm swing and straight-line trajectory control to knock down pins.', 'Easy, Medium, Hard', 'Pull back arm and release forward on the center lane axis.', 1, 'bowling', 'Forward Swing'],
    ['gm_badminton', 'Badminton', 'Speed & Agility', 'Overhead reaching and fine spatial racquet placement for lightweight shuttlecock returns.', 'Easy, Medium, Hard', 'Interception shuttlecock at high elevation zone.', 1, 'badminton', 'Overhead Reach'],
    ['gm_target_shooting', 'Target Shooting', 'Stability & Precision', 'Non-weapon laser target alignment tracking tremors, hold stability, and trigger precision.', 'Easy, Medium, Hard', 'Hold reticle over illuminated rehabilitation target and hold steady.', 1, 'target', 'Pointer Stability'],
    ['gm_virtual_catch', 'Virtual Catch', 'Hand-Eye Coordination', 'Anticipate parabolic flight paths and close hand upon ball arrival.', 'Easy, Medium, Hard', 'Position glove under falling trajectory and squeeze hand.', 1, 'catch', 'Reach & Grasp'],
    ['gm_balloon_pop', 'Balloon Pop', 'Range & Speed', 'Ascending colorful balloons requiring multi-directional reaching across all screen quadrants.', 'Easy, Medium, Hard', 'Touch or pop balloons before they drift above the ceiling zone.', 1, 'balloon', 'Touch / Click'],
    ['gm_fruit_reach', 'Fruit Reach', 'Reaching & Grasping', 'Harvest ripe fruits hanging from virtual branches at various heights and lateral offsets.', 'Easy, Medium, Hard', 'Reach to branch, close fist, and lower into basket.', 1, 'fruit', 'Reach & Lower'],
    ['gm_object_sorting', 'Object Sorting', 'Cognitive & Motor', 'Sort geometric shapes into matching bins by spatial translation and release.', 'Easy, Medium, Hard', 'Pick up colored block and translate to corresponding colored receptacle.', 1, 'shapes', 'Pick & Place'],
    ['gm_virtual_painting', 'Virtual Painting', 'Continuous Motion', 'Follow therapeutic brush paths on a 3D canvas to restore fluid motor patterns.', 'Easy, Medium, Hard', 'Trace continuous therapeutic curve without breaking stroke velocity.', 1, 'palette', 'Continuous Path'],
    ['gm_memory_matching', 'Memory Matching', 'Cognitive Motor Dual-Task', 'Spatial card memory challenge demanding reaching and working memory recall.', 'Easy, Medium, Hard', 'Reach and flip pairs of therapeutic recovery symbol cards.', 1, 'brain', 'Reach & Select'],
    ['gm_rhythm_reaction', 'Rhythm and Reaction', 'Cadence & Velocity', 'Tap rhythm beacons synchronized to therapeutic metronomic beats.', 'Easy, Medium, Hard', 'Strike incoming rhythm bars in sync with auditory pulse.', 1, 'music', 'Timed Touch'],
    ['gm_hand_puzzle', 'Hand-Controlled Puzzle', 'Fine Motor Logic', 'Rotate and assemble polygonal puzzle pieces into designated target slots.', 'Easy, Medium, Hard', 'Rotate hand clockwise or counter-clockwise to align puzzle key.', 1, 'puzzle', 'Rotation & Insert'],
    ['gm_virtual_gardening', 'Virtual Gardening', 'Sensory Rehabilitation', 'Pour water, plant seeds, and tend virtual flora with gentle therapeutic gestures.', 'Easy, Medium, Hard', 'Tilt virtual watering can over thirsty sprouts.', 1, 'flower', 'Pour & Tend'],
    ['gm_reach_stars', 'Reach the Stars', 'Elevation & Stretch', 'Stretch skyward to capture celestial star constellations arranged along reaching arcs.', 'Easy, Medium, Hard', 'Extend arm upward into maximum comfortable reach zone.', 1, 'sparkles', 'Vertical Stretch'],
    ['gm_balance_challenge', 'Balance and Coordination', 'Dual-Limb Stability', 'Maintain center of balance of a virtual tray carrying fragile virtual orbs.', 'Easy, Medium, Hard', 'Tilt wrist smoothly to keep rolling sphere centered.', 1, 'scale', 'Wrist Tilt Balance'],
    ['gm_hand_grasp', 'Hand Grasp Challenge', 'Isometric Strength', 'Controlled squeeze and isometric grip hold challenges measuring sustained power.', 'Easy, Medium, Hard', 'Squeeze virtual dynamometer to target zone and maintain 3 seconds.', 1, 'hand-metal', 'Isometric Clench'],
    ['gm_spatial_collection', 'Spatial Object Collection', '3D Depth Navigation', 'Navigate a recovery orb through 3D spatial rings in virtual depth corridors.', 'Easy, Medium, Hard', 'Guide cursor through series of near, mid, and far spatial rings.', 1, 'navigation', 'Depth Translation'],
    ['gm_fluid_motion', 'Fluid Motion Flow', 'Smoothness & Relaxation', 'Guide gentle water currents across river stepping stones to ease muscular hypertonicity.', 'Easy, Medium, Hard', 'Glide hand along the flowing stream contour.', 1, 'waves', 'Smooth Flow']
  ];

  for (const gm of games) {
    db.run('INSERT INTO games_catalog (id, title, category, description, difficulty_options, instructions, active_status, thumbnail, controls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', gm);
  }

  // 7. Therapist Recommendations / Prescriptions for pt_1
  db.run(`INSERT INTO therapist_recommendations (id, therapist_id, patient_id, exercise_id, game_id, target_reps, frequency, difficulty, duration_minutes, instructions, clinical_notes, start_date, end_date, status) VALUES
    ('rec_1', 'th_1', 'pt_1', 'ex_squeeze_fill', NULL, 15, 'Twice Daily', 'Moderate', 15, 'Perform complete finger extension before full clench. Watch for forearm compensatory elevation.', 'Demonstrates 12% improvement in grip sustained hold over previous week. Maintain 15 reps.', '2026-11-01', '2026-11-15', 'active'),
    ('rec_2', 'th_1', 'pt_1', 'ex_reach_touch', NULL, 20, 'Daily', 'Moderate', 20, 'Focus on smooth shoulder forward flexion. Avoid torso tilting.', 'Right arm active reach reached 74 degrees shoulder flexion. Progress to 20 reps.', '2026-11-01', '2026-11-15', 'active'),
    ('rec_3', 'th_1', 'pt_1', NULL, 'gm_balloon_pop', 30, 'Daily (Recreational)', 'Easy', 10, 'Use for warm-up before reach exercises. Emphasize multi-quadrant reaching.', 'Patient reports high engagement with balloon popping.', '2026-11-01', '2026-11-15', 'active')
  `);

  // 8. Sessions History with realistic longitudinal data
  const sampleSessions = [
    ['sess_1', 'pt_1', 'ex_squeeze_fill', null, 'exercise', '2026-10-27 10:15:00', '2026-10-27 10:28:00', 780, 15, 88.5, 62.0, 480, 72.0, 'webcam_mediapipe', 'Optimal (98%)', 'Completed baseline morning set with steady cadence.'],
    ['sess_2', 'pt_1', 'ex_reach_touch', null, 'exercise', '2026-10-28 11:00:00', '2026-10-28 11:18:00', 1080, 20, 91.2, 68.5, 420, 74.5, 'webcam_mediapipe', 'Optimal (96%)', 'Smooth trajectory; reduced shoulder hike noted.'],
    ['sess_3', 'pt_1', 'ex_squeeze_fill', null, 'exercise', '2026-10-29 09:45:00', '2026-10-29 09:59:00', 840, 15, 93.0, 71.0, 395, 78.0, 'webcam_mediapipe', 'Optimal (99%)', 'Full bucket reached with minimal pause.'],
    ['sess_4', 'pt_1', null, 'gm_balloon_pop', 'game', '2026-10-30 16:30:00', '2026-10-30 16:42:00', 720, 32, 94.5, 74.0, 360, 80.0, 'desktop_sim', 'Simulated 6-DoF', 'Reached 32 balloon pops, score 3200.'],
    ['sess_5', 'pt_1', 'ex_reach_touch', null, 'exercise', '2026-11-01 10:00:00', '2026-11-01 10:21:00', 1260, 20, 95.8, 79.2, 340, 83.5, 'webcam_mediapipe', 'Optimal (99%)', 'Personal best reaction latency 340ms.'],
    ['sess_6', 'pt_1', 'ex_squeeze_fill', null, 'exercise', '2026-11-02 09:15:00', '2026-11-02 09:30:00', 900, 15, 96.4, 82.0, 325, 86.0, 'webcam_mediapipe', 'Optimal (100%)', 'Excellent clench-release rhythm. Zero tracking drops.']
  ];

  for (const s of sampleSessions) {
    db.run('INSERT INTO sessions (id, patient_id, exercise_id, game_id, session_type, start_time, end_time, duration_seconds, repetitions_completed, accuracy_pct, range_of_motion_deg, reaction_time_ms, grip_strength_score, device_type, tracking_quality, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', s);
  }

  // 9. Badges (Strictly no emojis! Clean tokens M1, 100%, SQ, REC, RT, PRG, EXT, PER, LV5, 50+)
  db.run(`INSERT INTO badges (id, user_id, badge_code, name, description) VALUES
    ('bg_1', 'u_patient_1', 'M1', 'Milestone 1 Complete', 'Completed first clinical prescribed rehabilitation module.'),
    ('bg_2', 'u_patient_1', '100%', 'Flawless Accuracy', 'Attained 95%+ precision across full target session.'),
    ('bg_3', 'u_patient_1', 'SQ', 'Sponge Master', 'Successfully compressed 100 virtual sponges with full release.'),
    ('bg_4', 'u_patient_1', 'REC', '7-Day Streak', 'Maintained 7 consecutive rehabilitation activity days.'),
    ('bg_5', 'u_patient_1', 'RT', 'Quick Reflex', 'Achieved sub-350ms average reaction latency on 3D targets.'),
    ('bg_6', 'u_patient_1', 'LV5', 'Level 4 Achiever', 'Accumulated 400+ clinical rehabilitation experience points.')
  `);

  // 10. Meetings
  db.run(`INSERT INTO meetings (id, patient_id, therapist_id, title, scheduled_time, duration_minutes, status, room_id, notes) VALUES
    ('mt_1', 'pt_1', 'th_1', 'Bi-Weekly Range of Motion Review', '2026-11-03 11:00:00', 30, 'scheduled', 'remotion-room-pt1-th1', 'Live clinical assessment of right shoulder abduction and grip strength progression.'),
    ('mt_2', 'pt_1', 'th_1', 'Prescription Optimization Check-in', '2026-11-07 15:30:00', 30, 'scheduled', 'remotion-room-pt1-th1-followup', 'Evaluate progress on Squeeze & Fill 15-rep sets and adjust resistance levels.')
  `);

  // 11. Messages
  db.run(`INSERT INTO messages (id, sender_id, receiver_id, message_text, translated_text, original_language, target_language, is_read) VALUES
    ('msg_1', 'u_therapist_1', 'u_patient_1', 'Hello Asha. Excellent progress on your Squeeze & Fill repetitions yesterday. Please ensure you open your fingers fully between clenches to maximize stretch.', 'नमस्ते आशा। कल आपके स्क्वीज़ और फिल अभ्यासों में उत्कृष्ट प्रगति रही। कृपया खिंचाव को अधिकतम करने के लिए मुट्ठी भींचने के बीच उंगलियों को पूरी तरह खोलना सुनिश्चित करें।', 'en', 'hi', 1),
    ('msg_2', 'u_patient_1', 'u_therapist_1', 'Thank you Dr. Rajesh! I felt much less fatigue today while reaching the higher targets.', 'धन्यवाद डॉ. राजेश! उच्च लक्ष्यों तक पहुंचते समय मुझे आज काफी कम थकान महसूस हुई।', 'en', 'en', 1),
    ('msg_3', 'u_therapist_1', 'u_patient_1', 'That is great news. I have added the Balloon Pop activity to your daily plan for dynamic reach variation.', 'यह बहुत अच्छी खबर है। मैंने गतिशील पहुंच विविधता के लिए आपकी दैनिक योजना में बैलून पॉप गतिविधि जोड़ी है।', 'en', 'hi', 0)
  `);

  // 12. Notifications
  db.run(`INSERT INTO notifications (id, user_id, title, message, notification_type, is_read, link_url) VALUES
    ('notif_1', 'u_patient_1', 'Prescription Updated', 'Dr. Rajesh updated your Squeeze & Fill target to 15 repetitions.', 'prescription', 0, '/patient#exercises'),
    ('notif_2', 'u_patient_1', 'Upcoming Video Meeting', 'Scheduled clinical review tomorrow at 11:00 AM with Dr. Rajesh.', 'meeting', 0, '/patient#meetings'),
    ('notif_3', 'u_therapist_1', 'Session Completed', 'Asha Sharma completed Squeeze & Fill with 96.4% accuracy.', 'milestone', 0, '/therapist#patients')
  `);

  // 13. Headset Devices
  db.run(`INSERT INTO headset_devices (id, user_id, device_name, device_type, serial_number, battery_level, tracking_status, is_connected) VALUES
    ('dev_1', 'u_patient_1', 'Meta Quest 3 (XR2 Motor Rehabilitation Edition)', 'meta_quest', 'MQ3-REMO-88942-IN', 94, '6-DoF Optical + Hand Tracking Ready', 0),
    ('dev_2', 'u_therapist_1', 'Clinical Supervision Headset (Quest Pro)', 'meta_quest', 'MQP-CLINIC-1029', 88, 'Stereo Passthrough Active', 0),
    ('dev_3', NULL, 'WebXR Desktop Simulator', 'desktop_sim', 'SIM-VIRTUAL-6DOF', 100, 'Desktop Sensor Emulation', 0)
  `);

  // 14. Audit logs
  db.run(`INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address) VALUES
    ('log_1', 'u_admin', 'SYSTEM_INITIALIZATION', 'database', 'remotion.sqlite', 'Platform seeded with clinical motor rehabilitation dataset.', '127.0.0.1')
  `);

  db.save();
  console.log('Database seeded successfully with all clinical records!');
}
