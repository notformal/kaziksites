/**
 * game-api.js — Client-side API client for game-server communication
 * 
 * Provides a unified interface for all PIXI.js games to:
 * - Authenticate users (register/login)
 * - Manage game sessions
 * - Submit spin/hand results
 * - Track game history
 * - Verify provably fair results
 * 
 * Usage:
 *   const api = new GameAPI({ baseUrl: 'http://localhost:8787' });
 *   const session = await api.createSession('slots-royal');
 *   const result = await api.spin(session.sessionId, 100, gameState);
 */

// ─── Configuration ──────────────────────────────────────────────

const DEFAULT_CONFIG = {
  baseUrl: import.meta.env?.VITE_API_URL || 'http://localhost:8787',
  tokenKey: 'casino_auth_token',
  expiresAtKey: 'casino_token_expires',
};

// ─── GameAPI Class ──────────────────────────────────────────────

export class GameAPI {
  /**
   * @param {Object} config
   * @param {string} config.baseUrl — Server base URL
   * @param {string} config.tokenKey — LocalStorage key for auth token
   */
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl;
    this.tokenKey = config.tokenKey || DEFAULT_CONFIG.tokenKey;
    this.expiresAtKey = config.expiresAtKey || DEFAULT_CONFIG.expiresAtKey;
  }

  // ─── Auth ────────────────────────────────────────────────────

  /** Register a new user. */
  async register(email, password, displayName) {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'register_failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    this._setToken(data.token, data.expiresAt);
    return data;
  }

  /** Login existing user. */
  async login(email, password) {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'login_failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    this._setToken(data.token, data.expiresAt);
    return data;
  }

  /** Logout and clear token. */
  async logout() {
    const token = this.getToken();
    if (!token) return;
    
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (e) {
      // Ignore network errors on logout
    }
    
    this._clearToken();
  }

  /** Get current user profile. */
  async getProfile() {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Profile fetch failed');
    return res.json();
  }

  /** Check if user is authenticated. */
  isAuthenticated() {
    const token = this.getToken();
    const expiresAt = localStorage.getItem(this.expiresAtKey);
    
    if (!token || !expiresAt) return false;
    if (Date.now() >= parseInt(expiresAt)) {
      this._clearToken();
      return false;
    }
    return true;
  }

  // ─── Wallet ──────────────────────────────────────────────────

  /** Get wallet balance and ledger. */
  async getWallet() {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/wallet`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Wallet fetch failed');
    return res.json();
  }

  /** Claim daily reward. */
  async claimDailyReward() {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/wallet/daily-reward`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Daily reward failed');
    return res.json();
  }

  // ─── Game Sessions ───────────────────────────────────────────

  /**
   * Create a new game session.
   * @param {string} gameId — Game ID (e.g., 'slots-royal')
   * @param {Object} options
   * @param {string} [options.clientSeed] — Custom client seed for provably fair
   * @returns {Promise<Object>} Session data
   */
  async createSession(gameId, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/games/${gameId}/session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ clientSeed: options.clientSeed }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'session_create_failed' }));
      throw new Error(err.error || 'Session creation failed');
    }
    return res.json();
  }

  /**
   * Submit a spin/hand result to the server.
   * @param {number} sessionId — Session ID
   * @param {number} betAmount — Bet in cents (e.g., 100 = $1.00)
   * @param {Object} gameState — Game state (reels, cards, etc.)
   * @param {Object} [provablyFair] — Provably fair data
   * @returns {Promise<Object>} Spin result
   */
  async spin(sessionId, betAmount, gameState, provablyFair = null) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/games/spin`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        betAmount,
        gameState,
        provablyFair,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'spin_failed' }));
      throw new Error(err.error || 'Spin failed');
    }
    return res.json();
  }

  /** Cashout and close session. */
  async cashout(gameId, sessionId) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/games/${gameId}/cashout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) throw new Error('Cashout failed');
    return res.json();
  }

  /**
   * Get game history.
   * @param {string} gameId — Game ID
   * @param {Object} options — Pagination options
   * @returns {Promise<Object>} History data
   */
  async getHistory(gameId, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page);
    if (options.limit) params.set('limit', options.limit);
    
    const res = await fetch(
      `${this.baseUrl}/api/games/${gameId}/history?${params}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('History fetch failed');
    return res.json();
  }

  /**
   * Verify provably fair result.
   * @param {string} gameId — Game ID
   * @param {number} nonce — Nonce to verify
   * @param {string} serverSeed — Server seed
   * @param {string} clientSeed — Client seed
   * @returns {Promise<Object>} Verification result
   */
  async verify(gameId, nonce, serverSeed, clientSeed) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const params = new URLSearchParams({ nonce, serverSeed, clientSeed });
    const res = await fetch(
      `${this.baseUrl}/api/games/${gameId}/verify?${params}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Verification failed');
    return res.json();
  }

  // ─── Favorites & Recents ─────────────────────────────────────

  /** Add game to favorites. */
  async addFavorite(gameId) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    await fetch(`${this.baseUrl}/api/favorites/${gameId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  /** Remove game from favorites. */
  async removeFavorite(gameId) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    await fetch(`${this.baseUrl}/api/favorites/${gameId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  /** Get favorite games. */
  async getFavorites() {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Favorites fetch failed');
    return res.json();
  }

  /** Record recent game play. */
  async recordPlay(gameId) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    await fetch(`${this.baseUrl}/api/recents/${gameId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  /** Get recent games. */
  async getRecents() {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    
    const res = await fetch(`${this.baseUrl}/api/recents`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Recents fetch failed');
    return res.json();
  }

  // ─── Token Management ────────────────────────────────────────

  /** Get stored auth token. */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /** Set auth token and expiry. */
  _setToken(token, expiresAt) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.expiresAtKey, new Date(expiresAt).getTime().toString());
  }

  /** Clear auth token. */
  _clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.expiresAtKey);
  }
}

// ─── Singleton Export ──────────────────────────────────────────

/** Default game API instance. */
export const gameApi = new GameAPI();

export default GameAPI;