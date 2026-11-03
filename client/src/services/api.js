import { io } from 'socket.io-client';

const API_BASE = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('remotion_token') || null;
    this.user = JSON.parse(localStorage.getItem('remotion_user') || 'null');
    this.socket = null;
    this.initSocket();
  }

  initSocket() {
    try {
      this.socket = io(window.location.origin, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        if (this.user) {
          this.socket.emit('join_channel', {
            userId: this.user.id,
            role: this.user.role,
            patientId: this.user.profile?.id,
            therapistId: this.user.profile?.id
          });
        }
      });
    } catch (err) {
      console.warn('Socket.IO initialization error:', err);
    }
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem('remotion_token', token);
      localStorage.setItem('remotion_user', JSON.stringify(user));
      if (this.socket && this.socket.connected) {
        this.socket.emit('join_channel', {
          userId: user.id,
          role: user.role,
          patientId: user.profile?.id,
          therapistId: user.profile?.id
        });
      }
    } else {
      localStorage.removeItem('remotion_token');
      localStorage.removeItem('remotion_user');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired
      this.setAuth(null, null);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  async demoSwitch(role, options = {}) {
    const payload = typeof role === 'object' ? role : { role, ...options };
    const data = await this.request('/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setAuth(data.token, data.user);
    return data;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  logout() {
    this.setAuth(null, null);
  }

  // Patient
  async getPatientDashboard(patientId = '') {
    return this.request(`/patient/dashboard${patientId ? `?patient_id=${patientId}` : ''}`);
  }

  async recordSession(sessionData) {
    return this.request('/patient/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }

  // Therapist
  async getTherapistPatients() {
    return this.request('/therapist/patients');
  }

  async getPatientDetails(patientId) {
    return this.request(`/therapist/patients/${patientId}`);
  }

  async createPrescription(prescription) {
    return this.request('/therapist/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescription)
    });
  }

  async updatePrescription(id, updates) {
    return this.request(`/therapist/prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Admin
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAdminUsers() {
    return this.request('/admin/users');
  }

  async createAdminUser(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async toggleUserActive(userId) {
    return this.request(`/admin/users/${userId}/toggle-active`, {
      method: 'PUT'
    });
  }

  async assignPatient(patientId, therapistId) {
    return this.request('/admin/assignments', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, therapist_id: therapistId })
    });
  }

  async importPatients(records) {
    return this.request('/admin/import/patients', {
      method: 'POST',
      body: JSON.stringify({ records })
    });
  }

  async resetDatabase() {
    return this.request('/admin/reset-database', {
      method: 'POST'
    });
  }

  // Exercises & Games
  async getExercises() {
    return this.request('/exercises');
  }

  async getGames() {
    return this.request('/games');
  }

  async toggleGameActive(gameId) {
    return this.request(`/admin/games/${gameId}/toggle`, {
      method: 'PUT'
    });
  }

  // Remo Assistant & Translation
  async askRemo(message, language = 'en') {
    return this.request('/remo/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language })
    });
  }

  async translateText(text, targetLanguage) {
    return this.request('/remo/translate', {
      method: 'POST',
      body: JSON.stringify({ text, target_language: targetLanguage })
    });
  }

  // Messages & Meetings
  async getMessages(otherUserId) {
    return this.request(`/messages/${otherUserId}`);
  }

  async sendMessage(receiverId, text, targetLanguage = 'hi') {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, message_text: text, target_language: targetLanguage })
    });
  }

  async getMeetings() {
    return this.request('/meetings');
  }

  async scheduleMeeting(meetingData) {
    return this.request('/meetings', {
      method: 'POST',
      body: JSON.stringify(meetingData)
    });
  }
}

export const api = new ApiService();
