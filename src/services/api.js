// ═══════════════════════════════════════════════════════════
// API SERVICE — Main API client for all backend communication
// Handles auth tokens, error handling, and retry logic
// ═══════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8787';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.tokenKey = 'casino_auth_token';
    this.expiresAtKey = 'casino_token_expires';
  }

  // ─── Token Management ──────────────────────────────
  
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token, expiresAt) {
    localStorage.setItem(this.tokenKey, token);
    if (expiresAt) {
      localStorage.setItem(this.expiresAtKey, new Date(expiresAt).getTime().toString());
    }
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.expiresAtKey);
  }

  isTokenExpired() {
    const expiresAt = localStorage.getItem(this.expiresAtKey);
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt);
  }

  // ─── Request Helper ──────────────────────────────
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available and not expired
    const token = this.getToken();
    if (token && !this.isTokenExpired()) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized — clear token and retry once without auth
      if (response.status === 401 && token) {
        this.clearToken();
        
        // Retry without auth for public endpoints
        if (!endpoint.includes('/auth/')) {
          const retryConfig = { ...config };
          delete retryConfig.headers['Authorization'];
          const retryResponse = await fetch(url, retryConfig);
          
          if (retryResponse.ok) {
            return this.handleResponse(retryResponse);
          }
        }
        
        throw new Error('Unauthorized — please login again');
      }

      return this.handleResponse(response);
    } catch (error) {
      // Network error handling with retry logic
      if (error.name === 'TypeError' && options.retry !== false) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.request(endpoint, { ...options, retry: false });
      }
      
      throw error;
    }
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // ─── HTTP Methods ──────────────────────────────
  
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // ─── Auth Endpoints ──────────────────────────────
  
  async login(email, password) {
    const data = await this.post('/api/auth/login', { email, password });
    if (data.token) {
      this.setToken(data.token, data.expiresAt);
    }
    return data;
  }

  async register(email, password, displayName) {
    const data = await this.post('/api/auth/register', { 
      email, password, displayName 
    });
    if (data.token) {
      this.setToken(data.token, data.expiresAt);
    }
    return data;
  }

  async logout() {
    try {
      await this.post('/api/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      this.clearToken();
    }
  }

  async getProfile() {
    return this.get('/api/profile');
  }

  // ─── Games Endpoints ──────────────────────────────
  
  async getGames(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/games?${params}`);
  }

  async getGameById(gameId) {
    return this.get(`/api/games/${gameId}`);
  }

  // ─── Live Games Endpoints ──────────────────────────────
  
  async getLiveGamesStatus() {
    return this.get('/api/live-games/status');
  }

  async getProviders() {
    return this.get('/api/live-games/providers');
  }

  async getTables(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/live-games/tables?${params}`);
  }

  async createTable(config) {
    return this.post('/api/live-games/tables', config);
  }

  async startRound(tableId) {
    return this.post(`/api/live-games/tables/${tableId}/start`);
  }

  // ─── Favorites & History ──────────────────────────────
  
  async getFavorites() {
    return this.get('/api/favorites');
  }

  async addFavorite(gameId) {
    return this.post(`/api/favorites/${gameId}`);
  }

  async removeFavorite(gameId) {
    return this.delete(`/api/favorites/${gameId}`);
  }

  async getPlayHistory(limit = 50) {
    return this.get(`/api/history?limit=${limit}`);
  }
}

// ─── Singleton Export ──────────────────────────────
export const apiService = new ApiService();
export default apiService;


