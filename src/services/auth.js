// ═══════════════════════════════════════════════════════════
// AUTH SERVICE — Authentication helpers and state management
// ═══════════════════════════════════════════════════════════

import { apiService } from './api.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.listeners = [];
    
    // Check for existing session on init
    this.checkExistingSession();
  }

  checkExistingSession() {
    const token = apiService.getToken();
    if (token && !apiService.isTokenExpired()) {
      this.loadUserProfile();
    } else if (token) {
      apiService.clearToken();
    }
  }

  async loadUserProfile() {
    try {
      const profile = await apiService.getProfile();
      this.currentUser = profile;
      this.isAuthenticated = true;
      this.notifyListeners();
      return profile;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.logout();
      throw error;
    }
  }

  async login(email, password) {
    try {
      const data = await apiService.login(email, password);
      await this.loadUserProfile();
      return data;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async register(email, password, displayName) {
    try {
      const data = await apiService.register(email, password, displayName);
      await this.loadUserProfile();
      return data;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async logout() {
    try {
      await apiService.logout();
    } catch (e) {
      // Ignore errors during logout
    } finally {
      this.currentUser = null;
      this.isAuthenticated = false;
      this.notifyListeners();
    }
  }

  updateBalance(newBalance) {
    if (this.currentUser) {
      this.currentUser.balance = newBalance;
      this.notifyListeners();
    }
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({ 
      isAuthenticated: this.isAuthenticated, 
      user: this.currentUser 
    }));
  }

  getBalance() {
    return this.currentUser?.balance || 0;
  }
}

// ─── Singleton Export ──────────────────────────────
export const authService = new AuthService();
export default authService;


