/**
 * WebXR Hardware Interface Service for ReMotion Platform
 * 
 * Interacts with genuine browser WebXR Device APIs (navigator.xr).
 * Never fakes hardware connection or battery status.
 */

class WebXRService {
  constructor() {
    this.xrSession = null;
    this.isSupported = false;
    this.isChecking = true;
    this.listeners = new Set();
    this.deviceInfo = null;
    this.simulationActive = false;

    this.checkSupport();
  }

  async checkSupport() {
    this.isChecking = true;
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        this.isSupported = supported;
        if (supported) {
          this.deviceInfo = {
            type: 'WebXR Immersive VR Device',
            api: 'WebXR Device API (Standard)',
            handTracking: 'Hand Tracking API Available'
          };
        }
      } catch (err) {
        console.warn('WebXR support check error:', err);
        this.isSupported = false;
      }
    } else {
      this.isSupported = false;
    }
    this.isChecking = false;
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const status = this.getStatus();
    this.listeners.forEach(cb => cb(status));
  }

  getStatus() {
    return {
      isSupported: this.isSupported,
      isChecking: this.isChecking,
      isConnected: !!this.xrSession,
      isSimulation: this.simulationActive,
      deviceInfo: this.deviceInfo,
      session: this.xrSession,
      statusLabel: this.xrSession
        ? 'Connected: Immersive WebXR Session Active'
        : this.simulationActive
        ? 'Desktop Simulation Active (Virtual 6-DoF)'
        : this.isSupported
        ? 'Hardware Ready: WebXR Compatible Headset Detected'
        : 'Disconnected: No Physical WebXR Device'
    };
  }

  /**
   * Request actual browser WebXR immersive-vr session
   */
  async requestImmersiveSession(renderer) {
    if (!('xr' in navigator)) {
      throw new Error('WebXR is not supported in this browser. Please use Meta Quest Browser or a WebXR-compatible browser with Oculus Link / SteamVR.');
    }

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });

      this.xrSession = session;
      this.simulationActive = false;

      if (renderer && renderer.xr) {
        await renderer.xr.setSession(session);
      }

      session.addEventListener('end', () => {
        this.xrSession = null;
        this.notify();
      });

      this.notify();
      return session;
    } catch (err) {
      console.error('Failed to initiate WebXR session:', err);
      throw err;
    }
  }

  /**
   * End WebXR session
   */
  async endSession() {
    if (this.xrSession) {
      try {
        await this.xrSession.end();
      } catch (err) {
        console.warn('Error ending session:', err);
      }
      this.xrSession = null;
    }
    this.simulationActive = false;
    this.notify();
  }

  /**
   * Clearly labeled Desktop Simulation Mode
   */
  enableSimulation() {
    this.simulationActive = true;
    this.xrSession = null;
    this.notify();
  }

  startDesktopSimulation() {
    this.enableSimulation();
  }

  disableSimulation() {
    this.simulationActive = false;
    this.notify();
  }

  stopDesktopSimulation() {
    this.disableSimulation();
  }
}

export const webxr = new WebXRService();
export const webxrService = webxr;
